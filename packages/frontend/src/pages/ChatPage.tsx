import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useWebSocket } from '../context/WebSocketProvider';

// --- Types ---
interface Message {
  sender: 'me' | 'partner' | 'system';
  text: string;
}

// --- Component ---
const ChatPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { lastMessage, sendMessage } = useWebSocket();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [partnerStatus, setPartnerStatus] = useState('Connected');
  const [showReportModal, setShowReportModal] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mode = searchParams.get('mode') || 'safe';
  
  // --- WebSocket Message Handling ---
  useEffect(() => {
    if (lastMessage) {
      switch(lastMessage.type) {
        case 'chatMessage':
          setMessages((prev) => [...prev, { sender: 'partner', text: lastMessage.payload.message }]);
          break;
        case 'partnerDisconnected':
          setPartnerStatus('Partner has disconnected.');
          setMessages((prev) => [...prev, { sender: 'system', text: 'Partner has disconnected.' }]);
          break;
        case 'reportConfirmed':
          setMessages((prev) => [...prev, { sender: 'system', text: 'Report sent. Thank you. Redirecting...' }]);
          setTimeout(() => navigate('/'), 3000);
          break;
      }
    }
  }, [lastMessage, navigate]);

  useEffect(() => {
    setMessages([{ sender: 'system', text: 'You are now connected to a stranger.' }]);
  }, [roomId]);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // --- UI Handlers ---
  const handleSendMessage = () => {
    if (inputValue.trim() && partnerStatus === 'Connected') {
      setMessages(prev => [...prev, { sender: 'me', text: inputValue }]);
      sendMessage(JSON.stringify({ type: 'chatMessage', payload: { message: inputValue } }));
      setInputValue('');
    }
  };

  const handleNext = () => {
    sendMessage(JSON.stringify({ type: 'requestNextPartner' }));
    navigate(`/waiting?mode=${mode}`);
  };

  const handleReport = () => {
    sendMessage(JSON.stringify({ type: 'reportUser' }));
    setShowReportModal(false);
  };

  // --- JSX with the new modal and report button ---
  return (
    <div className="h-screen w-screen flex flex-col bg-black md:bg-transparent font-sans">
      {/* --- REPORT MODAL --- */}
      {showReportModal && (
        <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm w-full text-center">
            <h2 className="text-2xl font-bold text-white">Report User?</h2>
            <p className="text-gray-400 my-4">
              Are you sure you want to report this user? This will immediately end your chat and ban them for 1 hour.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setShowReportModal(false)}
                className="bg-gray-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReport}
                className="bg-red-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-700 transition-colors"
              >
                Yes, Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main UI Layout */}
      <div className="hidden md:block absolute inset-0 bg-gray-700 z-0"></div>
      <div className="relative z-10 flex flex-col h-full w-full md:flex-row">
        <div className="hidden md:flex flex-auto"></div>
        <div className="flex flex-col h-full w-full bg-black bg-opacity-50 md:w-[400px] md:bg-gray-800 md:bg-opacity-100 md:border-l md:border-gray-700">
          
          <header className="p-3 border-b border-white border-opacity-10 flex justify-between items-center">
            <h1 className="text-lg font-semibold text-white">{partnerStatus}</h1>
            <button onClick={() => setShowReportModal(true)} className="text-gray-400 hover:text-white" title="Report User">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6H8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>
            </button>
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
              <button onClick={handleNext} className="bg-red-600 text-white font-bold p-3 rounded-full hover:bg-red-700 transition-colors" title="Next Chat">
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
              <button onClick={handleSendMessage} className="bg-blue-600 text-white font-bold p-3 rounded-full hover:bg-blue-700 transition-colors" title="Send Message">
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
