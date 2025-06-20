import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useWebSocket } from '../context/WebSocketProvider';

interface Message {
  sender: 'me' | 'partner' | 'system';
  text: string;
}

const ChatPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  // --- FIX APPLIED HERE: 'isConnected' has been removed ---
  const { lastMessage, sendMessage } = useWebSocket();

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [partnerStatus, setPartnerStatus] = useState('Connected');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const mode = searchParams.get('mode') || 'safe';
  
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setMessages([{ sender: 'system', text: 'You are now connected to a stranger.' }]);
    return () => {
      clearTimeout(timeoutRef.current);
    }
  }, [roomId]);


  useEffect(() => {
    if (lastMessage) {
      switch(lastMessage.type) {
        case 'chatMessage':
          setMessages((prev) => [...prev, { sender: 'partner', text: lastMessage.payload.message }]);
          break;
        case 'partnerDisconnected':
          setPartnerStatus('Partner has disconnected.');
          setMessages((prev) => [...prev, { sender: 'system', text: 'Partner has disconnected. Searching for a new partner...' }]);
          sendMessage(JSON.stringify({ type: 'requestNextPartner' }));
          timeoutRef.current = setTimeout(() => {
            setMessages(prev => [...prev, { sender: 'system', text: 'No new partners available. Returning to waiting room.' }]);
            setTimeout(() => navigate(`/waiting?mode=${mode}`), 2000);
          }, 10000);
          break;
        case 'matchFound':
          clearTimeout(timeoutRef.current);
          navigate(`/chat/${lastMessage.payload.roomId}?mode=${mode}`, { replace: true });
          setMessages([{ sender: 'system', text: 'New partner found!' }]);
          setPartnerStatus('Connected');
          break;
      }
    }
  }, [lastMessage, navigate, sendMessage, mode]);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = () => {
    if (inputValue.trim() && partnerStatus === 'Connected') {
      setMessages((prev) => [...prev, { sender: 'me', text: inputValue }]);
      sendMessage(JSON.stringify({
        type: 'chatMessage',
        payload: { message: inputValue },
      }));
      setInputValue('');
    }
  };
  
  const handleNext = () => {
    setPartnerStatus('Searching for next partner...');
    setMessages(prev => [...prev, { sender: 'system', text: 'You have skipped. Searching for a new partner...' }]);
    sendMessage(JSON.stringify({ type: 'requestNextPartner' }));
    timeoutRef.current = setTimeout(() => {
        setMessages(prev => [...prev, { sender: 'system', text: 'No new partners available. Returning to waiting room.' }]);
        setTimeout(() => navigate(`/waiting?mode=${mode}`), 2000);
    }, 10000);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-black md:bg-transparent font-sans">
      <div className="hidden md:block absolute inset-0 bg-gray-700 z-0"></div>
      <div className="relative z-10 flex flex-col h-full w-full md:flex-row">
        <div className="hidden md:flex flex-auto"></div>
        <div className="flex flex-col h-full w-full bg-black bg-opacity-50 
                        md:w-[400px] md:bg-gray-800 md:bg-opacity-100 md:border-l md:border-gray-700">
          <header className="p-4 border-b border-white border-opacity-10 text-center">
            <h1 className="text-lg font-semibold text-white">{partnerStatus}</h1>
            <p className="text-xs text-gray-400">Room ID: {roomId?.substring(0, 8)}</p>
          </header>
          <main className="flex-1 p-4 overflow-y-auto space-y-2 flex flex-col justify-end">
            {messages.map((msg, index) => (
              <div key={index} className={`flex items-end w-full ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                {msg.sender === 'system' 
                  ? <p className="text-center w-full text-sm text-yellow-400 italic my-2">{msg.text}</p>
                  : <p className={`max-w-[80%] px-4 py-2 rounded-2xl ${msg.sender === 'me' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-100'}`}>{msg.text}</p>
                }
              </div>
            ))}
            <div ref={messagesEndRef} />
          </main>
          <footer className="p-4 border-t border-white border-opacity-10">
            <div className="flex items-center space-x-2">
              <button onClick={handleNext} className="bg-red-600 text-white font-bold p-3 rounded-full hover:bg-red-700 transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </button>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 bg-gray-700 border-gray-600 rounded-full py-3 px-5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                placeholder="Type a message..."
              />
              <button onClick={handleSendMessage} className="bg-blue-600 text-white font-bold p-3 rounded-full hover:bg-blue-700 transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
