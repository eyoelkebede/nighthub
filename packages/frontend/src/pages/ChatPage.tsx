import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../context/WebSocketProvider';

// --- Type definition for a chat message ---
interface Message {
  sender: 'me' | 'partner' | 'system';
  text: string;
}

// --- WebRTC Configuration using Google's public STUN servers ---
const PEER_CONNECTION_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
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
  const [partnerStatus, setPartnerStatus] = useState('Connecting...');

  // --- WebRTC Signaling Logic ---

  // This function creates the WebRTC offer to initiate the call
  const createOffer = useCallback(async (pc: RTCPeerConnection) => {
    try {
      if (pc.signalingState !== 'stable') {
        console.warn('Cannot create offer in non-stable state:', pc.signalingState);
        return;
      }
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendMessage(JSON.stringify({ type: 'webrtc-offer', payload: pc.localDescription }));
    } catch (error) {
      console.error("Error creating offer:", error);
    }
  }, [sendMessage]);

  // Main effect to handle incoming WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    const { type, payload } = lastMessage;
    const pc = peerConnectionRef.current;

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
      if (!pc || !pc.remoteDescription) {
        // This is a common race condition, we can safely ignore candidates that arrive too early
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error('Error adding received ice candidate', e);
      }
    };
    
    switch (type) {
      case 'webrtc-create-offer':
        if (pc) createOffer(pc);
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
        setPartnerStatus('Partner has disconnected.');
        setMessages((prev) => [...prev, { sender: 'system', text: 'Partner has disconnected.' }]);
        // Here you could implement logic to automatically find a new partner
        break;
      default:
        break;
    }
  }, [lastMessage, navigate, sendMessage, createOffer]);

  // Effect to initialize media and the peer connection. Runs only ONCE on mount.
  useEffect(() => {
    const initialize = async () => {
      console.log(`Initializing chat room: ${roomId}`);
      
      const pc = new RTCPeerConnection(PEER_CONNECTION_CONFIG);
      peerConnectionRef.current = pc;

      // When the remote user's video track is received, add it to the video element.
      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          console.log("✅ Received remote track, displaying video.");
          remoteVideoRef.current.srcObject = event.streams[0];
          setPartnerStatus('Connected');
        }
      };

      // When a network path is found, send it to the other peer.
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendMessage(JSON.stringify({ type: 'webrtc-ice-candidate', payload: event.candidate }));
        }
      };

      // Get access to the user's camera and microphone.
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;

        // Display our own video.
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Add our video/audio tracks to the connection to be sent.
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        // Tell the server we are ready to start the signaling process.
        sendMessage(JSON.stringify({ type: 'webrtc-ready' }));

      } catch (error) {
        console.error("Error accessing media devices.", error);
        setMessages([{ sender: 'system', text: "Could not access camera/mic. Please check permissions and refresh." }]);
      }
    };

    initialize();

    // Cleanup function when the component is unmounted.
    return () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      localStreamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, [roomId, sendMessage]);

  // --- UI Logic and Handlers ---
  const handleSendMessage = () => {
    if (inputValue.trim()) {
      setMessages((prev) => [...prev, { sender: 'me', text: inputValue }]);
      sendMessage(JSON.stringify({ type: 'chatMessage', payload: { message: inputValue } }));
      setInputValue('');
    }
  };

  const handleNext = () => {
    sendMessage(JSON.stringify({ type: 'requestNextPartner' }));
    navigate(`/waiting?mode=safe`); // Assuming 'safe' for now, can be made dynamic
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-900 text-white font-sans">
      
      {/* Main Video & Controls Area */}
      <div className="flex-1 flex flex-col bg-black overflow-hidden">
        {/* The video container forces a square aspect ratio */}
        <div className="relative w-full h-full flex items-center justify-center">
          <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
            {partnerStatus !== 'Connected' && <p className="text-xl">{partnerStatus}</p>}
          </div>

          {/* Our own video in a square, picture-in-picture view */}
          <div className="absolute bottom-6 right-6 w-1/4 max-w-xs aspect-square bg-gray-800 border-2 border-gray-500 rounded-xl shadow-lg overflow-hidden">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-gray-800 p-4 flex justify-center items-center space-x-4 border-t border-gray-700">
          <button onClick={handleNext} className="bg-blue-600 text-white font-bold py-3 px-8 rounded-full hover:bg-blue-700 transition-colors text-lg">
            Next
          </button>
        </div>
      </div>
      
      {/* Text Chat Area */}
      <div className="w-full md:w-96 flex flex-col bg-gray-800 border-l border-gray-700">
        <header className="p-4 border-b border-gray-700 text-center">
          <h1 className="text-lg font-semibold">Chat</h1>
        </header>
        <main className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-end ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex flex-col space-y-1 text-sm max-w-xs mx-2 order-2 items-${msg.sender === 'me' ? 'end' : 'start'}`}>
                {msg.sender === 'system' 
                  ? <p className="text-center w-full text-sm text-yellow-400 italic">{msg.text}</p>
                  : <p className={`px-4 py-2 rounded-2xl inline-block ${msg.sender === 'me' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-600 text-gray-100 rounded-bl-none'}`}>{msg.text}</p>
                }
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </main>
        <footer className="p-4 border-t border-gray-700">
          <div className="flex items-center">
            <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} className="flex-1 bg-gray-700 border-gray-600 rounded-l-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white" placeholder="Type a message..."/>
            <button onClick={handleSendMessage} className="bg-blue-600 text-white font-bold p-3 rounded-full hover:bg-blue-700 transition-colors">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ChatPage;
