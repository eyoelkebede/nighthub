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
  const { lastMessage, sendMessage } = useWebSocket();

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

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendMessage(JSON.stringify({
            type: 'webrtc-ice-candidate',
            payload: event.candidate,
          }));
        }
      };

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
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        sendMessage(JSON.stringify({ type: 'webrtc-ready' }));
      })
      .catch(error => {
        console.error("Error accessing media devices.", error);
      });

    // 3. Listen for messages from the WebSocket context
    if (lastMessage) {
      const { type, payload } = lastMessage;

      const pc = peerConnectionRef.current;

      if (type === 'webrtc-create-offer' && !pc) {
        createPeerConnection();
        const newPc = peerConnectionRef.current!;
        const localStream = localVideoRef.current?.srcObject as MediaStream;
        localStream.getTracks().forEach(track => newPc.addTrack(track, localStream));

        newPc.createOffer()
          .then(offer => newPc.setLocalDescription(offer))
          .then(() => {
            sendMessage(JSON.stringify({
              type: 'webrtc-offer',
              payload: newPc.localDescription,
            }));
          });
      } else if (type === 'webrtc-offer' && !pc) {
        createPeerConnection();
        const newPc = peerConnectionRef.current!;
        newPc.setRemoteDescription(new RTCSessionDescription(payload));
        
        const localStream = localVideoRef.current?.srcObject as MediaStream;
        localStream.getTracks().forEach(track => newPc.addTrack(track, localStream));

        newPc.createAnswer()
          .then(answer => newPc.setLocalDescription(answer))
          .then(() => {
            sendMessage(JSON.stringify({
              type: 'webrtc-answer',
              payload: newPc.localDescription,
            }));
          });
      } else if (type === 'webrtc-answer' && pc) {
        pc.setRemoteDescription(new RTCSessionDescription(payload));
      } else if (type === 'webrtc-ice-candidate' && pc) {
        pc.addIceCandidate(new RTCIceCandidate(payload));
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
        peerConnectionRef.current = null;
      }
      if (localVideoRef.current && localVideoRef.current.srcObject) {
        (localVideoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, [lastMessage, sendMessage, navigate]);
  
  // Scroll to new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Function to handle sending a text message
  const handleSendMessage = () => {
    if (inputValue.trim()) {
      setMessages((prev) => [...prev, { sender: 'me', text: inputValue }]);
      sendMessage(JSON.stringify({
        type: 'chatMessage',
        payload: { message: inputValue },
      }));
      setInputValue('');
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-800 text-white font-sans">
      {/* Video Area */}
      <div className="flex-1 flex flex-col bg-black relative">
        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-4 right-4 w-1/4 max-w-xs border-2 border-gray-600 rounded-md" />
      </div>
      
      {/* Chat Area */}
      <div className="w-full md:w-96 flex flex-col border-l border-gray-700">
        <header className="bg-gray-900 p-4 shadow-md text-center border-b border-gray-700">
          <h1 className="text-xl font-bold">Chatting</h1>
          <p className="text-xs text-gray-400">Room: {roomId?.substring(0, 8)}...</p>
        </header>

        <main className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'system' ? (
                   <div className="text-center w-full text-sm text-yellow-400 italic">
                      <p>{msg.text}</p>
                   </div>
                ) : (
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      msg.sender === 'me' ? 'bg-blue-600 rounded-br-none' : 'bg-gray-700 rounded-bl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                )}
              </div>
            ))}
             <div ref={messagesEndRef} />
          </div>
        </main>
        
        <footer className="bg-gray-900 p-4 border-t border-gray-700">
          <div className="flex items-center">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1 bg-gray-700 border border-gray-600 rounded-l-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type a message..."
            />
            <button
              onClick={handleSendMessage}
              className="bg-blue-600 text-white font-bold py-2 px-4 rounded-r-md hover:bg-blue-700 transition-colors"
            >
              Send
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ChatPage;