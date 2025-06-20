import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useWebSocket } from '../context/WebSocketProvider';

// --- Type definition for a chat message ---
interface Message {
  sender: 'me' | 'partner' | 'system';
  text: string;
}

// --- WebRTC Configuration ---
const PEER_CONNECTION_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

// --- The Main Chat Page Component ---
const ChatPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { lastMessage, sendMessage, isConnected } = useWebSocket();

  // --- Refs ---
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- State ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [partnerStatus, setPartnerStatus] = useState('Connecting...');
  const mode = searchParams.get('mode') || 'safe';

  // --- WebRTC Setup and Teardown ---
  useEffect(() => {
    const initialize = async () => {
      console.log(`[INIT] ChatPage for room ${roomId} mounted.`);
      
      const pc = new RTCPeerConnection(PEER_CONNECTION_CONFIG);
      peerConnectionRef.current = pc;
      
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendMessage(JSON.stringify({ type: 'webrtc-ice-candidate', payload: event.candidate }));
        }
      };
      
      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          console.log("✅ [PC] Remote track received, displaying video.");
          remoteVideoRef.current.srcObject = event.streams[0];
          setPartnerStatus('Connected');
        }
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        sendMessage(JSON.stringify({ type: 'webrtc-ready' }));
      } catch (error) {
        console.error("Error accessing media devices:", error);
        setMessages([{ sender: 'system', text: "Camera/Mic permission denied." }]);
      }
    };

    if (isConnected) {
      initialize();
    }

    // Cleanup function
    return () => {
      console.log('[CLEANUP] Unmounting ChatPage.');
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      localStreamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, [roomId, isConnected, sendMessage]);

  // --- WebSocket Message Handling ---
  const createOffer = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc || pc.signalingState !== 'stable') return;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendMessage(JSON.stringify({ type: 'webrtc-offer', payload: pc.localDescription }));
    } catch (error) {
      console.error("Error creating offer:", error);
    }
  }, [sendMessage]);

  useEffect(() => {
    if (!lastMessage || !peerConnectionRef.current) return;

    const { type, payload } = lastMessage;
    const pc = peerConnectionRef.current;

    const handleOffer = async (offer: RTCSessionDescriptionInit) => {
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
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (error) {
        console.error("Error handling answer:", error);
      }
    };

    const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
      try {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (e) {
        console.error('Error adding received ice candidate', e);
      }
    };
    
    switch (type) {
      case 'webrtc-create-offer': createOffer(); break;
      case 'webrtc-offer': handleOffer(payload); break;
      case 'webrtc-answer': handleAnswer(payload); break;
      case 'webrtc-ice-candidate': handleIceCandidate(payload); break;
      case 'chatMessage': setMessages(prev => [...prev, { sender: 'partner', text: payload.message }]); break;
      case 'partnerDisconnected':
        setPartnerStatus('Partner has disconnected.');
        setMessages(prev => [...prev, { sender: 'system', text: 'Partner has disconnected.' }]);
        break;
      default: break;
    }
  }, [lastMessage, sendMessage, createOffer]);

  // --- UI Handlers and Logic ---
  const handleSendMessage = () => { /* ... unchanged ... */ };
  const handleNext = () => {
    sendMessage(JSON.stringify({ type: 'requestNextPartner' }));
    navigate(`/waiting?mode=${mode}`);
  };
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // --- Final JSX with Square Video ---
  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-900 text-white font-sans">
      
      {/* Video Area */}
      <div className="flex-1 flex flex-col bg-black overflow-hidden">
        {/* Main container for video feeds */}
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Remote video uses object-cover to fill its container */}
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          
          {/* Connection Status Overlay */}
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none">
            {partnerStatus !== 'Connected' && (
              <div className="bg-black bg-opacity-60 px-4 py-2 rounded-lg">
                <p className="text-xl text-white">{partnerStatus}</p>
              </div>
            )}
          </div>

          {/* Local video is forced into a square aspect ratio */}
          <div className="absolute bottom-6 right-6 w-1/5 max-w-[220px] aspect-square bg-gray-800 border-2 border-gray-500 rounded-2xl shadow-lg overflow-hidden">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-gray-800 p-4 flex justify-center items-center space-x-6 border-t border-gray-700">
          <button onClick={handleNext} className="bg-blue-600 text-white font-bold py-3 px-8 rounded-full hover:bg-blue-700 transition-colors text-lg">
            Next
          </button>
        </div>
      </div>
      
      {/* Text Chat Area */}
      <div className="w-full md:w-96 flex flex-col bg-gray-800 border-l border-gray-700">
        {/* Header, Messages, and Footer JSX are unchanged */}
        <header className="p-4 border-b border-gray-700 text-center">
          <h1 className="text-lg font-semibold">Chat</h1>
        </header>
        <main className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-end ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex flex-col space-y-1 text-sm max-w-xs mx-2 order-2 items-${msg.sender === 'me' ? 'end' : 'start'}`}>
                {msg.sender === 'system' 
                  ? <p className="text-center w-full text-sm text-yellow-400 italic">{msg.text}</p>
                  : <p className={`px-4 py-2 rounded-2xl inline-block ${msg.sender === 'me' ? 'bg-blue-600 rounded-br-none' : 'bg-gray-700 rounded-bl-none'}`}>{msg.text}</p>
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
