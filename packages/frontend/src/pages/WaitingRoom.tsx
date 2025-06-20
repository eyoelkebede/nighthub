import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../context/WebSocketProvider';
import { v4 as uuidv4 } from 'uuid'; // <-- ADD THIS LINE

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
const adjectives = ['Cosmic', 'Witty', 'Silent', 'Golden', 'Cyber', 'Neon', 'Lunar'];
const nouns = ['Fox', 'Panda', 'Rider', 'Ghost', 'Dragon', 'Ninja', 'Wizard'];
const generateRandomUsername = () => `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;


// --- The Component ---
const WaitingRoom: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { lastMessage, sendMessage, isConnected } = useWebSocket();

    const mode = searchParams.get('mode') || 'safe';
    const [queuePosition, setQueuePosition] = useState<number | string>('...');
    const [queueTotal, setQueueTotal] = useState<number | string>('...');
    const [statusMessage, setStatusMessage] = useState('Connecting...');

    // --- State for new features ---
    const [messages, setMessages] = useState<Message[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [showInactivityModal, setShowInactivityModal] = useState(false);

    const username = useMemo(() => generateRandomUsername(), []);
    const myIdRef = useRef<string>(uuidv4());
    const inactivityTimerRef = useRef<NodeJS.Timeout>();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    // --- Logic for Inactivity Timer ---
    const resetInactivityTimer = () => {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = setTimeout(() => {
            setShowInactivityModal(true);
        }, 60 * 1000);
    };

    useEffect(() => {
        resetInactivityTimer();
        window.addEventListener('mousemove', resetInactivityTimer);
        window.addEventListener('keypress', resetInactivityTimer);
        return () => {
            clearTimeout(inactivityTimerRef.current);
            window.removeEventListener('mousemove', resetInactivityTimer);
            window.removeEventListener('keypress', resetInactivityTimer);
        };
    }, []);
    
    // --- WebSocket Logic ---
    useEffect(() => {
        if (isConnected) {
            setStatusMessage('Joining queue...');
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
                    setStatusMessage(`Match found! Connecting...`);
                    navigate(`/chat/${lastMessage.payload.roomId}?mode=${mode}`);
                    break;
                case 'waitingRoomChat':
                    setMessages(prev => [...prev, { ...lastMessage.payload, type: 'chat' }]);
                    break;
                case 'systemMessage':
                    setMessages(prev => [...prev, { ...lastMessage.payload, type: 'system' }]);
                    break;
                default:
                    break;
            }
        }
    }, [lastMessage, navigate, mode]);

    // Scroll to new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    
    const handleSendChatMessage = () => {
        if (chatInput.trim()) {
            sendMessage(JSON.stringify({
                type: 'waitingRoomChat',
                payload: { username, message: chatInput }
            }));
            setChatInput('');
        }
    };

    // --- JSX ---
    return (
        <div className="bg-gray-900 text-white min-h-screen flex flex-col md:flex-row font-sans">
            {/* ... JSX is unchanged ... */}
        </div>
    );
};

export default WaitingRoom;
