import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../context/WebSocketProvider';
import { v4 as uuidv4 } from 'uuid';

// Type Definitions
interface ChatMessage {
    senderId: string;
    username: string;
    message: string;
}
type Message = ChatMessage & { type: 'chat' };

// --- Helper for Random Usernames ---
const adjectives = ['Cosmic', 'Witty', 'Silent', 'Golden', 'Cyber', 'Neon', 'Lunar', 
  'Electric', 'Shadow', 'Crimson', 'Frozen', 'Iron', 'Rapid', 'Sapphire', 'Mystic', 'Vivid', 'Obsidian', 'Stealthy', 'Radiant', 'Blazing', 'Stormy',
  'Quantum', 'Fierce', 'Silent', 'Echoing', 'Jaded', 'Twilight', 'Velvet',
  'Savage', 'Chrome', 'Nova', 'Icy', 'Solar', 'Enchanted', 'Hollow', 'Burning',
  'Celestial', 'Phantom', 'Arcane', 'Titan', 'Vortex', 'Nebula', 'Spectral', 'Glacial',
  'Thunderous', 'Mystical', 'Abyssal', 'Galactic', 'Radiant', 'Infernal', 'Ethereal', 'Cobalt', 'Emerald', 'Onyx'];
const nouns = ['Fox', 'Panda', 'Rider', 'Ghost', 'Dragon', 'Ninja', 'Wizard'
  , 'Knight', 'Hunter', 'Raven', 'Tiger', 'Wolf', 'Phoenix', 'Viper', 'Falcon',
  'Shark', 'Bear', 'Eagle', 'Lion', 'Panther', 'Cobra', 'Jaguar', 'Leopard',
  'Griffin', 'Mantis', 'Scorpion', 'Crab', 'Owl', 'Hawk', 'Bison', 'Rhino',
  'Stingray', 'Wolf', 'Viper', 'Samurai', 'Phoenix', 'Titan', 'Falcon', 'Reaper',
  'Knight', 'Specter', 'Hunter', 'Rogue', 'Siren', 'Golem', 'Warden',
  'Ronin', 'Jaguar', 'Druid', 'Glitch', 'Raven', 'Monk', 'Demon', 'Sentinel',
  'Griffin', 'Sniper', 'Nomad', 'Berserker', 'Oracle', 'Hawk', 'Drone', 'Mage'
];
const generateRandomUsername = () => `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;


// --- The Component ---
const WaitingRoom: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { lastMessage, sendMessage, isConnected } = useWebSocket();

    const mode = searchParams.get('mode') || 'safe';
    const [queuePosition, setQueuePosition] = useState<number | string>('...');
    const [queueTotal, setQueueTotal] = useState<number | string>('...');
    const [messages, setMessages] = useState<Message[]>([]);
    const [chatInput, setChatInput] = useState('');

    const username = useMemo(() => generateRandomUsername(), []);
    const myIdRef = useRef<string>(uuidv4());
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Join queue once WebSocket is connected
    useEffect(() => {
        if (isConnected) {
            sendMessage(JSON.stringify({ type: 'joinQueue', payload: { mode } }));
        }
    }, [isConnected, mode, sendMessage]);

    // Handle incoming messages from server
    useEffect(() => {
        if (lastMessage) {
            switch(lastMessage.type) {
                case 'queueUpdate':
                    setQueuePosition(lastMessage.payload.position);
                    setQueueTotal(lastMessage.payload.total);
                    break;
                case 'matchFound':
                    navigate(`/chat/${lastMessage.payload.roomId}?mode=${mode}`);
                    break;
                case 'waitingRoomChat':
                    setMessages(prev => [...prev, { ...lastMessage.payload, type: 'chat' }]);
                    break;
            }
        }
    }, [lastMessage, navigate, mode]);

    // Scroll chat to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    
    const handleSendChatMessage = () => {
        if (chatInput.trim()) {
            sendMessage(JSON.stringify({
                type: 'waitingRoomChat',
                payload: { senderId: myIdRef.current, username, message: chatInput }
            }));
            setChatInput('');
        }
    };

    return (
        <div className="bg-gray-900 text-white min-h-screen flex flex-col md:flex-row font-sans">
            <div className="w-full md:w-1/3 flex flex-col items-center justify-center p-8 border-b-2 md:border-b-0 md:border-r-2 border-gray-800">
                <h1 className="text-4xl font-bold uppercase tracking-wider text-green-400">WAITING ROOM</h1>
                <p className="mt-4 text-lg text-gray-400">Searching for a partner...</p>
                <div className="mt-12 w-20 h-20 border-4 border-dashed rounded-full animate-spin border-green-400"></div>
                <p className="mt-12 text-md text-gray-500">Position in Queue</p>
                <div className="mt-2 text-4xl font-bold">
                    <span className="text-white">{queuePosition}</span>
                    <span className="text-gray-600 mx-2">/</span>
                    <span className="text-gray-400">{queueTotal}</span>
                </div>
            </div>

            <div className="flex-1 flex flex-col bg-gray-800">
                <header className="p-4 border-b border-gray-700 text-center">
                    <h2 className="text-lg font-semibold">Group Chat ({mode} mode)</h2>
                    <p className="text-sm text-gray-400">You are: <span className="font-bold text-teal-400">{username}</span></p>
                </header>
                <main className="flex-1 p-4 overflow-y-auto space-y-4">
                    {messages.map((msg, index) => {
                        const isMe = msg.senderId === myIdRef.current;
                        return (
                            <div key={index} className={`flex items-end ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex flex-col space-y-1 text-sm max-w-xs mx-2 order-2 ${isMe ? 'items-end' : 'items-start'}`}>
                                    {!isMe && <span className="text-xs text-gray-400">{msg.username}</span>}
                                    <p className={`px-4 py-2 rounded-2xl inline-block ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-100 rounded-bl-none'}`}>
                                        {msg.message}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </main>
                <footer className="p-4 border-t border-gray-700">
                    <div className="flex items-center">
                        <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendChatMessage()} className="flex-1 bg-gray-700 border-gray-600 rounded-l-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white" placeholder="Chat with others waiting..."/>
                        <button onClick={handleSendChatMessage} className="bg-blue-600 text-white font-bold p-3 rounded-r-full hover:bg-blue-700 transition-colors">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default WaitingRoom;
