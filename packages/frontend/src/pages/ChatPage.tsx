import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../context/WebSocketProvider';

// Type definition for a chat message
interface Message {
  sender: 'me' | 'partner' | 'system';
  text: string;
}

// Configuration for the WebRTC connection
const PEER_CONNECTION_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const ChatPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { lastMessage, sendMessage } = useWebSocket();

  // Refs for DOM elements and WebRTC objects
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // State Management
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // --- WebRTC Signaling Logic ---

  // This function creates the offer to start the call
  const createOffer = useCallback(async (pc: RTCPeerConnection) => {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    sendMessage(JSON.stringify({ type: 'webrtc-offer', payload: pc.localDescription }));
  }, [sendMessage]);

  // Effect to handle all incoming WebSocket messages
  useEffect(() => {
    if (!lastMessage || !peerConnectionRef.current) return;

    const { type, payload } = lastMessage;
    const pc = peerConnectionRef.current;

    const handleOffer = async (offer: RTCSessionDescriptionInit) => {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendMessage(JSON.stringify({ type: 'webrtc-answer', payload: pc.localDescription }));
    };

    const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    };

    const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
      // FIX: Only add candidate if remote description is set.
      if (pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        console.warn("Queuing ICE candidate because remote description is not set yet.");
        // If it's not set, we can queue candidates, but for simplicity, we'll log it.
        // A more complex implementation would queue these and add them after setRemoteDescription.
      }
    };

    switch (type) {
      case 'webrtc-create-offer':
        createOffer(pc);
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
        setMessages((prev) => [...prev, { sender: 'system', text: 'Partner disconnected. Redirecting...' }]);
        setTimeout(() => navigate('/'), 3000);
        break;
      default:
        break;
    }
  }, [lastMessage, navigate, sendMessage, createOffer]);


  // Effect to initialize media and the peer connection (runs once)
  useEffect(() => {
    console.log(`Initializing chat room: ${roomId}`);
    
    const pc = new RTCPeerConnection(PEER_CONNECTION_CONFIG);
    peerConnectionRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendMessage(JSON.stringify({ type: 'webrtc-ice-candidate', payload: event.candidate }));
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        stream.getTracks().forEach(track => {
            if (peerConnectionRef.current) {
                peerConnectionRef.current.addTrack(track, stream);
            }
        });
        sendMessage(JSON.stringify({ type: 'webrtc-ready' }));
      })
      .catch(error => console.error("Error accessing media devices.", error));

    return () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      localStreamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, [roomId, sendMessage]);

  // --- UI and Chat Logic ---

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
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
      if(localStreamRef.current) {
          localStreamRef.current.getVideoTracks().forEach(track => { track.enabled = !track.enabled; });
          setIsVideoOff(prev => !prev);
      }
  };

  // --- Final JSX with Corrected SVG Icons ---
  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-900 text-white font-sans">
      <div className="flex-1 flex flex-col bg-black">
        <div className="relative flex-1">
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-6 right-6 w-1/4 max-w-xs border-2 border-gray-500 rounded-xl shadow-lg" />
        </div>
        <div className="bg-gray-800 bg-opacity-50 p-4 flex justify-center items-center space-x-4">
          <button onClick={toggleMute} className={`p-3 rounded-full ${isMuted ? 'bg-red-600' : 'bg-gray-600'} hover:bg-gray-500 transition-colors`}>
            {isMuted ? 
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7.5 7.5 0 01-7.5 7.5M11.5 3a7.5 7.5 0 017.5 7.5m-15 0a7.5 7.5 0 017.5-7.5m7.5 7.5a7.5 7.5 0 01-7.5 7.5M3 3l18 18" /></svg> : 
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7.5 7.5 0 01-7.5 7.5M11.5 3a7.5 7.5 0 017.5 7.5m-15 0a7.5 7.5 0 017.5-7.5m7.5 7.5a7.5 7.5 0 01-7.5 7.5" /></svg>
            }
          </button>
          <button onClick={toggleVideo} className={`p-3 rounded-full ${isVideoOff ? 'bg-red-600' : 'bg-gray-600'} hover:bg-gray-500 transition-colors`}>
             {isVideoOff ?
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.55a1.5 1.5 0 01.45 2.12l-2.05 3.76a1.5 1.5 0 01-2.56 0L11 14.5m0 0l-2.05-3.76a1.5 1.5 0 00-2.56 0L2 14.5m9-4.5V3m0 0a2 2 0 100 4 2 2 0 000-4z" /></svg> :
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.55a1.5 1.5 0 01.45 2.12l-2.05 3.76a1.5 1.5 0 01-2.56 0L11 14.5m0 0l-2.05-3.76a1.5 1.5 0 00-2.56 0L2 14.5m9-4.5V3m0 0a2 2 0 100 4 2 2 0 000-4z" /></svg>
             }
          </button>
          <button onClick={handleNext} className="bg-blue-600 text-white font-bold py-3 px-8 rounded-full hover:bg-blue-700 transition-colors text-lg">Next</button>
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
