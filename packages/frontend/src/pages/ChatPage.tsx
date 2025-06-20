import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../context/WebSocketProvider';

// --- Type definition for a chat message ---
interface Message {
  sender: 'me' | 'partner' | 'system';
  text: string;
}

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

  // --- WebRTC and Signaling Logic ---

  // useCallback ensures these functions are not recreated on every render
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

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

    peerConnectionRef.current = pc;
    return pc;
  }, [sendMessage]);

  // Effect to handle incoming WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    const { type, payload } = lastMessage;
    const pc = peerConnectionRef.current;

    const handleOffer = async (offer: RTCSessionDescriptionInit) => {
      const currentPC = pc || createPeerConnection();
      await currentPC.setRemoteDescription(new RTCSessionDescription(offer));
      localStreamRef.current?.getTracks().forEach(track => currentPC.addTrack(track, localStreamRef.current!));
      const answer = await currentPC.createAnswer();
      await currentPC.setLocalDescription(answer);
      sendMessage(JSON.stringify({ type: 'webrtc-answer', payload: currentPC.localDescription }));
    };

    const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    };

    const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
      if (!pc) return;
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    };
    
    switch (type) {
      case 'webrtc-create-offer':
        handleOffer(payload); // We treat the initial request as an offer itself
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
        setMessages((prev) => [...prev, { sender: 'system', text: 'Partner disconnected. Finding a new match...' }]);
        setTimeout(() => navigate('/'), 3000);
        break;
      default:
        break;
    }
  }, [lastMessage, navigate, sendMessage, createPeerConnection]);

  // Effect to initialize media and clean up on exit
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        sendMessage(JSON.stringify({ type: 'webrtc-ready' }));
      })
      .catch(error => console.error("Error accessing media devices.", error));

    return () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      localStreamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, [sendMessage]);

  // --- UI Logic ---

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

  const handleNext = () => {
    // For now, this just navigates home. Later it could re-queue.
    navigate('/');
  };

  // --- JSX for the final UI ---
  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-900 text-white font-sans">
      
      {/* Main Video & Controls Area */}
      <div className="flex-1 flex flex-col bg-black">
        {/* Video Feeds */}
        <div className="relative flex-1">
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-6 right-6 w-1/4 max-w-xs border-2 border-gray-500 rounded-xl shadow-lg" />
        </div>

        {/* Action Bar */}
        <div className="bg-gray-800 bg-opacity-50 p-4 flex justify-center items-center space-x-4">
          <button onClick={() => setIsMuted(!isMuted)} className={`p-3 rounded-full ${isMuted ? 'bg-red-600' : 'bg-gray-600'} hover:bg-gray-500 transition-colors`}>
             {/* Mute Icon SVG */}
          </button>
          <button onClick={() => setIsVideoOff(!isVideoOff)} className={`p-3 rounded-full ${isVideoOff ? 'bg-red-600' : 'bg-gray-600'} hover:bg-gray-500 transition-colors`}>
             {/* Video Icon SVG */}
          </button>
          <button onClick={handleNext} className="bg-blue-600 text-white font-bold py-3 px-8 rounded-full hover:bg-blue-700 transition-colors text-lg">
            Next
          </button>
        </div>
      </div>
      
      {/* Text Chat Area */}
      <div className="w-full md:w-96 flex flex-col bg-gray-800 border-l border-gray-700">
        <header className="p-4 border-b border-gray-700 text-center">
          <h1 className="text-lg font-semibold">Nighthub Chat</h1>
        </header>

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
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1 bg-gray-700 border-gray-600 rounded-l-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type a message..."
            />
            <button onClick={handleSendMessage} className="bg-blue-600 text-white font-bold py-2 px-6 rounded-r-full hover:bg-blue-700 transition-colors">
              Send
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ChatPage;