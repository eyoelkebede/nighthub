import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../context/WebSocketProvider';

interface Message {
  sender: 'me' | 'partner' | 'system';
  text: string;
}

const ChatPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { lastMessage, sendMessage, isConnected } = useWebSocket();

  // Refs for video elements and the peer connection
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  // State for text chat
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Main useEffect for WebRTC and WebSocket logic ---
  useEffect(() => {
    // Google's public STUN servers
    const stunServers = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    // 1. Function to create and configure the peer connection
    const createPeerConnection = () => {
      const pc = new RTCPeerConnection(stunServers);

      // Event handler for when an ICE candidate is generated
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendMessage(JSON.stringify({
            type: 'webrtc-ice-candidate',
            payload: event.candidate,
          }));
        }
      };

      // Event handler for when the remote stream is added
      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      peerConnectionRef.current = pc;
    };

    // 2. Get user media (camera and microphone)
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        // Display our own video
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        // Tell the server we are ready for the video call
        sendMessage(JSON.stringify({ type: 'webrtc-ready' }));
      })
      .catch(error => {
        console.error("Error accessing media devices.", error);
        // Handle error - maybe show a message to the user
      });

    // 3. Listen for messages from the WebSocket context
    if (lastMessage) {
      const { type, payload } = lastMessage;

      if (type === 'webrtc-create-offer') {
        createPeerConnection();
        const pc = peerConnectionRef.current!;
        const localStream = localVideoRef.current?.srcObject as MediaStream;
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

        pc.createOffer()
          .then(offer => pc.setLocalDescription(offer))
          .then(() => {
            sendMessage(JSON.stringify({
              type: 'webrtc-offer',
              payload: pc.localDescription,
            }));
          });
      } else if (type === 'webrtc-offer') {
        createPeerConnection();
        const pc = peerConnectionRef.current!;
        pc.setRemoteDescription(new RTCSessionDescription(payload));
        
        const localStream = localVideoRef.current?.srcObject as MediaStream;
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

        pc.createAnswer()
          .then(answer => pc.setLocalDescription(answer))
          .then(() => {
            sendMessage(JSON.stringify({
              type: 'webrtc-answer',
              payload: pc.localDescription,
            }));
          });
      } else if (type === 'webrtc-answer') {
        peerConnectionRef.current?.setRemoteDescription(new RTCSessionDescription(payload));
      } else if (type === 'webrtc-ice-candidate') {
        peerConnectionRef.current?.addIceCandidate(new RTCIceCandidate(payload));
      } else if (type === 'chatMessage') {
        setMessages((prev) => [...prev, { sender: 'partner', text: payload.message }]);
      } else if (type === 'partnerDisconnected') {
        setMessages((prev) => [...prev, { sender: 'system', text: 'Your partner has disconnected. Redirecting...' }]);
        setTimeout(() => navigate('/'), 3000);
      }
    }

    // Cleanup logic
    return () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      // Stop media tracks
      if (localVideoRef.current && localVideoRef.current.srcObject) {
        (localVideoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, [lastMessage, sendMessage, navigate]);
  
  // --- Text Chat Logic (no changes) ---
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  const handleSendMessage = () => { /* ... no change ... */ };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-800 text-white font-sans">
      {/* Video Area */}
      <div className="flex-1 flex flex-col bg-black relative">
        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-4 right-4 w-1/4 max-w-xs border-2 border-gray-600 rounded-md" />
      </div>
      
      {/* Chat Area */}
      <div className="w-full md:w-96 flex flex-col border-l border-gray-700">
        {/* Header */}
        <header className="bg-gray-900 p-4 shadow-md text-center border-b border-gray-700">
          <h1 className="text-xl font-bold">Chatting</h1>
          <p className="text-xs text-gray-400">Room: {roomId?.substring(0, 8)}...</p>
        </header>
        {/* Message Display Area */}
        <main className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-4">{/* ... mapping messages logic (no change) ... */}</div>
        </main>
        {/* Message Input Area */}
        <footer className="bg-gray-900 p-4 border-t border-gray-700">
          <div className="flex items-center">{/* ... input and button (no change) ... */}</div>
        </footer>
      </div>
    </div>
  );
};

export default ChatPage;