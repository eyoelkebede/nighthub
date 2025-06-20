import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../context/WebSocketProvider';

// Type definition for a chat message
interface Message {
  sender: 'me' | 'partner' | 'system';
  text: string;
}

// Configuration for the WebRTC connection, using Google's public STUN servers
const PEER_CONNECTION_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

// --- The Main Chat Page Component ---
const ChatPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { lastMessage, sendMessage } = useWebSocket();

  // --- Refs for DOM elements and WebRTC objects ---
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- State Management ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // --- WebRTC Logic ---

  // Effect to handle all incoming WebSocket messages from the server
  useEffect(() => {
    if (!lastMessage) return; // Do nothing if there's no new message

    const { type, payload } = lastMessage;
    const pc = peerConnectionRef.current;

    const createOffer = async () => {
      if (!pc) return;
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendMessage(JSON.stringify({ type: 'webrtc-offer', payload: pc.localDescription }));
      } catch (error) {
        console.error("Error creating offer:", error);
      }
    };

    const handleOffer = async (offer: RTCSessionDescriptionInit) => {
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendMessage(JSON.stringify({ type: 'webrtc-answer', payload: pc.localDescription }));
      } catch (error) {
        console.error("Error handling offer:", error);
      }
    };

    const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (error) {
        console.error("Error handling answer:", error);
      }
    };

    const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
      if (!pc) return;
      try {
        // Only add candidate if remote description is set.
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (error) {
        console.error('Error adding received ice candidate', error);
      }
    };

    switch (type) {
      case 'webrtc-create-offer':
        createOffer();
        break;
      case 'webrtc-offer':
        handleOffer(payload);
        break;
      case 'webrtc-answer':
        handleAnswer(payload);
        break;
      case 'webrtc-ice-candidate':
        handleIceCandidate(payload);
        break;
      case 'chatMessage':
        setMessages((prev) => [...prev, { sender: 'partner', text: payload.message }]);
        break;
      case 'partnerDisconnected':
        setMessages((prev) => [...prev, { sender: 'system', text: 'Partner has disconnected. Finding a new match...' }]);
        setTimeout(() => navigate('/'), 3000);
        break;
      default:
        break;
    }
  }, [lastMessage, navigate, sendMessage]);

  // Effect to initialize media and the peer connection (runs only ONCE on mount)
  useEffect(() => {
    const initializeConnection = async () => {
      console.log(`Initializing chat room: ${roomId}`);
      
      // 1. Create the Peer Connection
      const pc = new RTCPeerConnection(PEER_CONNECTION_CONFIG);
      peerConnectionRef.current = pc;

      // 2. Set up event listeners for the peer connection
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendMessage(JSON.stringify({ type: 'webrtc-ice-candidate', payload: event.candidate }));
        }
      };

      pc.ontrack = (event) => {
        // When a remote track is received, attach it to the remote video element
        if (remoteVideoRef.current && event.streams[0]) {
          console.log("Received remote track, attaching to video element.");
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // 3. Get User Media (Camera/Mic)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;

        // Display our own video locally
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Add our media tracks to the peer connection to be sent to the partner
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        // 4. Tell the server we are ready
        sendMessage(JSON.stringify({ type: 'webrtc-ready' }));
      } catch (error) {
        console.error("Error accessing media devices.", error);
        setMessages([{sender: 'system', text: "Could not access camera/mic. Please check permissions."}]);
      }
    };

    initializeConnection();

    // Cleanup function when the component unmounts (user navigates away)
    return () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      localStreamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, [roomId, sendMessage]);

  // --- UI Logic and Handlers ---

  // Scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Send a text message
  const handleSendMessage = () => {
    if (inputValue.trim()) {
      setMessages((prev) => [...prev, { sender: 'me', text: inputValue }]);
      sendMessage(JSON.stringify({ type: 'chatMessage', payload: { message: inputValue } }));
      setInputValue('');
    }
  };

  const handleNext = () => navigate('/');

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => { track.enabled = !track.enabled; });
      setIsMuted(prev => !prev);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => { track.enabled = !track.enabled; });
      setIsVideoOff(prev => !prev);
    }
  };

  // --- Final, Polished JSX ---
  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-900 text-white font-sans">
      
      {/* Main Video & Controls Area */}
      <div className="flex-1 flex flex-col bg-black overflow-hidden">
        <div className="relative flex-1">
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-6 right-6 w-1/4 max-w-xs border-2 border-gray-500 rounded-xl shadow-lg" />
        </div>

        <div className="bg-gray-800 p-4 flex justify-center items-center space-x-4 border-t border-gray-700">
          <button onClick={toggleMute} className={`p-3 rounded-full transition-colors ${isMuted ? 'bg-red-600' : 'bg-gray-600 hover:bg-gray-500'}`}>
            {isMuted ? 
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7.5 7.5 0 01-7.5 7.5M11.5 3a7.5 7.5 0 017.5 7.5m-15 0a7.5 7.5 0 017.5-7.5m7.5 7.5a7.5 7.5 0 01-7.5 7.5M3 3l18 18" /></svg> : 
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7.5 7.5 0 01-7.5 7.5M11.5 3a7.5 7.5 0 017.5 7.5m-15 0a7.5 7.5 0 017.5-7.5m7.5 7.5a7.5 7.5 0 01-7.5 7.5" /></svg>
            }
          </button>
          <button onClick={handleNext} className="bg-blue-600 text-white font-bold py-3 px-8 rounded-full hover:bg-blue-700 transition-colors text-lg">Next</button>
          <button onClick={toggleVideo} className={`p-3 rounded-full transition-colors ${isVideoOff ? 'bg-red-600' : 'bg-gray-600 hover:bg-gray-500'}`}>
             {isVideoOff ?
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.55a1.5 1.5 0 01.45 2.12l-2.05 3.76a1.5 1.5 0 01-2.56 0L11 14.5m0 0l-2.05-3.76a1.5 1.5 0 00-2.56 0L2 14.5m9-4.5V3m0 0a2 2 0 100 4 2 2 0 000-4z" /></svg> :
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.55a1.5 1.5 0 01.45 2.12l-2.05 3.76a1.5 1.5 0 01-2.56 0L11 14.5m0 0l-2.05-3.76a1.5 1.5 0 00-2.56 0L2 14.5m9-4.5V3m0 0a2 2 0 100 4 2 2 0 000-4z" /></svg>
             }
          </button>
        </div>
      </div>
      
      <div className="w-full md:w-96 flex flex-col bg-gray-800 border-l border-gray-700">
        <header className="p-4 border-b border-gray-700 text-center"><h1 className="text-lg font-semibold">Nighthub Chat</h1></header>
        <main className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
              {msg.sender === 'system' 
                ? <p className="text-center w-full text-sm text-yellow-500 italic">{msg.text}</p>
                : <p className={`max-w-xs px-4 py-2 rounded-2xl ${msg.sender === 'me' ? 'bg-blue-600 rounded-br-none' : 'bg-gray-700 rounded-bl-none'}`}>{msg.text}</p>
              }
            </div>
          ))}
          <div ref={messagesEndRef} />
        </main>
        <footer className="p-4 border-t border-gray-700">
          <div className="flex items-center">
            <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} className="flex-1 bg-gray-700 border-gray-600 rounded-l-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Type a message..."/>
            <button onClick={handleSendMessage} className="bg-blue-600 text-white font-bold py-2 px-6 rounded-r-full hover:bg-blue-700 transition-colors">Send</button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ChatPage;
