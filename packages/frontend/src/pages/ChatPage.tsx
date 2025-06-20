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
  // Use a ref to hold the RTCPeerConnection. This persists across re-renders.
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  // State for text chat
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Effect for WebRTC Setup (runs only ONCE) ---
  useEffect(() => {
    // This effect runs once when the component mounts to set up video and the peer connection.
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    // When the browser generates a network candidate, send it to the other peer via the server.
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendMessage(JSON.stringify({
          type: 'webrtc-ice-candidate',
          payload: event.candidate,
        }));
      }
    };

    // When the other user's video stream arrives, attach it to the remote video element.
    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    peerConnectionRef.current = pc;

    // Get access to the user's camera and microphone.
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        // Display our own video stream.
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        // Add our local stream tracks to the peer connection so they can be sent to the partner.
        stream.getTracks().forEach(track => {
          if (peerConnectionRef.current) {
            peerConnectionRef.current.addTrack(track, stream);
          }
        });
        // After getting media, tell the server we are ready.
        sendMessage(JSON.stringify({ type: 'webrtc-ready' }));
      })
      .catch(error => {
        console.error("Error accessing media devices.", error);
      });

    // The cleanup function runs when the component unmounts.
    return () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      // Stop all media tracks to turn off the camera light.
      if (localVideoRef.current && localVideoRef.current.srcObject) {
        (localVideoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, [sendMessage]); // This dependency array ensures this setup runs only once.


  // --- Effect for Handling WebSocket Messages (runs whenever a new message arrives) ---
  useEffect(() => {
    if (!lastMessage) return; // Do nothing if there's no message

    const { type, payload } = lastMessage;
    const pc = peerConnectionRef.current;

    const handleCreateOffer = async () => {
      if (!pc) return;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendMessage(JSON.stringify({ type: 'webrtc-offer', payload: pc.localDescription }));
    };
    
    const handleOffer = async (offer: RTCSessionDescriptionInit) => {
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendMessage(JSON.stringify({ type: 'webrtc-answer', payload: pc.localDescription }));
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
        handleCreateOffer();
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
        setMessages((prev) => [...prev, { sender: 'system', text: 'Your partner has disconnected. Redirecting...' }]);
        setTimeout(() => navigate('/'), 3000);
        break;
      default:
        break;
    }
  }, [lastMessage, navigate, sendMessage]);

  
  // --- Text Chat Logic ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
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

  // --- JSX for the component ---
  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-800 text-white font-sans">
      <div className="flex-1 flex flex-col bg-black relative">
        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-4 right-4 w-1/4 max-w-xs border-2 border-gray-600 rounded-md" />
      </div>
      <div className="w-full md:w-96 flex flex-col border-l border-gray-700">
        <header className="bg-gray-900 p-4 shadow-md text-center border-b border-gray-700">
          <h1 className="text-xl font-bold">Chatting</h1>
          <p className="text-xs text-gray-400">Room: {roomId?.substring(0, 8)}...</p>
        </header>
        <main className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-4">
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                {msg.sender === 'system' ? (
                   <div className="text-center w-full text-sm text-yellow-400 italic"><p>{msg.text}</p></div>
                ) : (
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${msg.sender === 'me' ? 'bg-blue-600 rounded-br-none' : 'bg-gray-700 rounded-bl-none'}`}>{msg.text}</div>
                )}
              </div>
            ))}
             <div ref={messagesEndRef} />
          </div>
        </main>
        <footer className="bg-gray-900 p-4 border-t border-gray-700">
          <div className="flex items-center">
            <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} className="flex-1 bg-gray-700 border border-gray-600 rounded-l-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Type a message..."/>
            <button onClick={handleSendMessage} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-r-md hover:bg-blue-700 transition-colors">Send</button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ChatPage;