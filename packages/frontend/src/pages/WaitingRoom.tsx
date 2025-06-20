import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../context/WebSocketProvider';
import { v4 as uuidv4 } from 'uuid';

// --- Types ---
interface ChatMessage {
    senderId: string;
    username: string;
    message: string;
}
interface SystemMessage {
    text: string;
}
type Message = (ChatMessage & { type: 'chat' }) | (SystemMessage & { type: 'system' });

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


/// --- The Component ---
const WaitingRoom: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { lastMessage, sendMessage, isConnected } = useWebSocket();

    const mode = searchParams.get('mode') || 'safe';
    const [queuePosition, setQueuePosition] = useState<number | string>('...');
    const [queueTotal, setQueueTotal] = useState<number | string>('...');
    const [statusMessage, setStatusMessage] = useState('Connecting...');

    // --- State and Refs for new features ---
    const [messages, setMessages] = useState<Message[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [showInactivityModal, setShowInactivityModal] = useState(false);

    const username = useMemo(() => generateRandomUsername(), []);
    const myIdRef = useRef<string>(uuidv4());
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Refs to hold the timer IDs
    const inactivityTimerRef = useRef<NodeJS.Timeout>();
    const finalCountdownTimerRef = useRef<NodeJS.Timeout>();

    // --- Logic for Inactivity Timer ---
    const resetInactivityTimer = useCallback(() => {
        // Clear any existing timers
        clearTimeout(inactivityTimerRef.current);
        clearTimeout(finalCountdownTimerRef.current);
        
        // If the modal is showing, hide it because we have activity
        if (showInactivityModal) {
            setShowInactivityModal(false);
        }

        // Set a new timer to show the modal after 1 minute of inactivity
        inactivityTimerRef.current = setTimeout(() => {
            console.log("User inactive, showing modal.");
            setShowInactivityModal(true);
        }, 60 * 1000); // 60 seconds
    }, [showInactivityModal]);

    // This effect runs when the inactivity modal appears
    useEffect(() => {
        if (showInactivityModal) {
            // When the modal appears, start a new 15-second countdown to disconnect
            finalCountdownTimerRef.current = setTimeout(() => {
                console.log("User did not respond to modal. Disconnecting.");
                // Navigating away will trigger the component to unmount,
                // which cleans up the WebSocket connection.
                navigate('/'); 
            }, 15 * 1000); // 15 seconds
        }
        // Cleanup the final countdown if the component unmounts or modal is hidden
        return () => clearTimeout(finalCountdownTimerRef.current);
    }, [showInactivityModal, navigate]);


    // Effect to set up and tear down global event listeners for user activity
    useEffect(() => {
        resetInactivityTimer(); // Start the timer when the component mounts

        // Listen for these events on the whole window
        window.addEventListener('mousemove', resetInactivityTimer);
        window.addEventListener('keypress', resetInactivityTimer);
        window.addEventListener('click', resetInactivityTimer);

        // Cleanup function when the component unmounts
        return () => {
            clearTimeout(inactivityTimerRef.current);
            clearTimeout(finalCountdownTimerRef.current);
            window.removeEventListener('mousemove', resetInactivityTimer);
            window.removeEventListener('keypress', resetInactivityTimer);
            window.removeEventListener('click', resetInactivityTimer);
        };
    }, [resetInactivityTimer]);
    
    // --- WebSocket and Message Logic (Unchanged) ---
    useEffect(() => {
        if (isConnected) {
            sendMessage(JSON.stringify({ type: 'joinQueue', payload: { mode } }));
        }
    }, [isConnected, mode, sendMessage]);

    useEffect(() => {
        if (lastMessage) {
            switch(lastMessage.type) {
                case 'queueUpdate':
                    setQueuePosition(lastMessage.payload.position);
                    setQueueTotal(lastMessage.payload.total);
                    setStatusMessage('Searching for a partner...');
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

    // --- JSX including the new Modal ---
    return (
        <div className="bg-gray-900 text-white min-h-screen flex flex-col md:flex-row font-sans">
            {/* Inactivity Modal Overlay */}
            {showInactivityModal && (
                <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-50 p-4 text-center">
                    <h2 className="text-4xl font-bold">Are you still there?</h2>
                    <p className="mt-4 text-lg text-gray-300">Click the button below to stay in the queue.</p>
                    <button 
                        onClick={resetInactivityTimer} // Clicking the button is activity
                        className="mt-8 bg-blue-600 text-white font-bold py-4 px-10 rounded-full hover:bg-blue-700 transition-colors text-xl"
                    >
                        I'm Still Here!
                    </button>
                    <p className="mt-4 text-sm text-gray-500">You will be disconnected otherwise.</p>
                </div>
            )}

            {/* Left Panel: Queue Status */}
            <div className="w-full md:w-1/3 flex flex-col items-center justify-center p-8 border-b-2 md:border-b-0 md:border-r-2 border-gray-800">
                <h1 className="text-4xl font-bold uppercase tracking-wider text-green-400">WAITING ROOM</h1>
                <p className="mt-4 text-lg text-gray-400">{statusMessage}</p>
                <div className="mt-12 w-20 h-20 border-4 border-dashed rounded-full animate-spin border-green-400"></div>
                <p className="mt-12 text-md text-gray-500">Your Position in Queue</p>
                <div className="mt-2 text-4xl font-bold">
                    <span className="text-white">{queuePosition}</span>
                    <span className="text-gray-600 mx-2">/</span>
                    <span className="text-gray-400">{queueTotal}</span>
                </div>
            </div>

            {/* Right Panel: Group Chat */}
            <div className="flex-1 flex flex-col bg-gray-800">
                <header className="p-4 border-b border-gray-700 text-center">
                    <h2 className="text-lg font-semibold">Waiting Room Group Chat ({mode} mode)</h2>
                    <p className="text-sm text-gray-400">You are: <span className="font-bold text-teal-400">{username}</span></p>
                </header>
                <main className="flex-1 p-4 overflow-y-auto space-y-4">
                    {messages.map((msg, index) => {
                        if (msg.type === 'system') return <p key={index} className="text-center w-full text-sm text-yellow-400 italic">{msg.text}</p>;
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
                        <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendChatMessage()}
                            className="flex-1 bg-gray-700 border-gray-600 rounded-l-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                            placeholder="Chat with everyone in the waiting room..."
                        />
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