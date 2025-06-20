import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useWebSocket } from '../context/WebSocketProvider';

// Type definition for a chat message
interface Message {
  sender: 'me' | 'partner' | 'system';
  text: string;
}

const ChatPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { lastMessage, sendMessage } = useWebSocket();

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [partnerStatus, setPartnerStatus] = useState('Connected');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Get the original mode from the URL to re-queue if needed
  const mode = searchParams.get('mode') || 'safe';

  // Listen for incoming messages
  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'chatMessage') {
        setMessages((prev) => [...prev, { sender: 'partner', text: lastMessage.payload.message }]);
      }
      if (lastMessage.type === 'partnerDisconnected') {
        setPartnerStatus('Partner has disconnected.');
        setMessages((prev) => [...prev, { sender: 'system', text: 'Partner has disconnected.' }]);
      }
    }
  }, [lastMessage]);
  
  // Scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // --- Handlers ---
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
  
  const handleNext = () => {
    // Tell the server we want a new partner
    sendMessage(JSON.stringify({ type: 'requestNextPartner' }));
    // Immediately go back to the waiting room
    navigate(`/waiting?mode=${mode}`);
  };

  return (
    // Main container uses a placeholder background for the "video"
    <div className="h-screen w-screen flex flex-col bg-gray-700 font-sans">

      {/* This div acts as the placeholder for the video feed */}
      <div className="absolute inset-0 bg-black z-0"></div>

      {/* Chat UI - uses a semi-transparent background on mobile */}
      <div className="relative z-10 flex flex-col h-full w-full 
                      md:flex-row md:bg-transparent">

        {/* Desktop: Spacer to push chat to the right */}
        <div className="hidden md:flex flex-auto"></div>

        {/* Chat Panel */}
        <div className="flex flex-col h-full w-full
                        md:w-[400px] md:bg-gray-800 md:border-l md:border-gray-700">

          {/* Header */}
          <header className="p-4 border-b border-white border-opacity-10 text-center">
            <h1 className="text-lg font-semibold text-white">{partnerStatus}</h1>
            <p className="text-xs text-gray-400">Room ID: {roomId?.substring(0, 8)}</p>
          </header>

          {/* Messages */}
          <main className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((msg, index) => (
              <div key={index} className={`flex items-end ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                {msg.sender === 'system' 
                  ? <p className="text-center w-full text-sm text-yellow-400 italic">{msg.text}</p>
                  : <div className={`flex flex-col space-y-1 text-sm max-w-xs mx-2 order-2 ${msg.sender === 'me' ? 'items-end' : 'items-start'}`}>
                      <div>
                        <p className={`px-4 py-2 rounded-2xl inline-block ${msg.sender === 'me' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-600 text-gray-100 rounded-bl-none'}`}>
                          {msg.text}
                        </p>
                      </div>
                    </div>
                }
              </div>
            ))}
            <div ref={messagesEndRef} />
          </main>

          {/* Input and Next Button Footer */}
          <footer className="p-4 border-t border-white border-opacity-10">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 bg-gray-700 border-gray-600 rounded-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                placeholder="Type a message..."
              />
              <button onClick={handleSendMessage} className="bg-blue-600 text-white font-bold p-3 rounded-full hover:bg-blue-700 transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
              </button>
              <button onClick={handleNext} className="bg-red-600 text-white font-bold p-3 rounded-full hover:bg-red-700 transition-colors">
                 <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
