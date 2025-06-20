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

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to the bottom of the chat on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Listen for incoming messages from the WebSocket context
  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'chatMessage') {
        setMessages((prev) => [...prev, { sender: 'partner', text: lastMessage.payload.message }]);
      }
      if (lastMessage.type === 'partnerDisconnected') {
        setMessages((prev) => [...prev, { sender: 'system', text: 'Your partner has disconnected. Redirecting...' }]);
        setTimeout(() => navigate('/'), 3000); // Go home after 3 seconds
      }
    }
  }, [lastMessage, navigate]);

  const handleSendMessage = () => {
    if (inputValue.trim() && isConnected) {
      // Add our own message to the UI immediately
      setMessages((prev) => [...prev, { sender: 'me', text: inputValue }]);
      
      // Send the message to the server
      sendMessage(JSON.stringify({
        type: 'chatMessage',
        payload: { message: inputValue },
      }));

      setInputValue(''); // Clear the input field
    }
  };
  
  return (
    <div className="flex flex-col h-screen bg-gray-800 text-white font-sans">
      {/* Header */}
      <header className="bg-gray-900 p-4 shadow-md text-center">
        <h1 className="text-xl font-bold">Chatting with a Stranger</h1>
        <p className="text-xs text-gray-400">Room: {roomId}</p>
      </header>

      {/* Message Display Area */}
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

      {/* Message Input Area */}
      <footer className="bg-gray-900 p-4">
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
  );
};

export default ChatPage;