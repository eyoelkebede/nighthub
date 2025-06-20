import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../context/WebSocketProvider'; // Import our new hook

const WaitingRoom: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { lastMessage, sendMessage, isConnected } = useWebSocket(); // Use the context

  const mode = searchParams.get('mode');
  const [queuePosition, setQueuePosition] = useState<number | string>('...');
  const [queueTotal, setQueueTotal] = useState<number | string>('...');
  const [statusMessage, setStatusMessage] = useState('Initializing...');

  // Effect to join the queue once connected
  useEffect(() => {
    if (isConnected) {
      setStatusMessage('Connecting to server...');
      const joinMessage = {
        type: 'joinQueue',
        payload: { mode: mode },
      };
      sendMessage(JSON.stringify(joinMessage));
    }
  }, [isConnected, mode, sendMessage]);

  // Effect to listen for messages from the server
  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'queueUpdate') {
        setQueuePosition(lastMessage.payload.position);
        setQueueTotal(lastMessage.payload.total);
        setStatusMessage('Searching for a partner...');
      }
      if (lastMessage.type === 'matchFound') {
        setStatusMessage(`Match found! Connecting to room...`);
        navigate(`/chat/${lastMessage.payload.roomId}`);
      }
    }
  }, [lastMessage, navigate]);

  return (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center font-sans">
      <h1 className="text-4xl font-bold uppercase tracking-wider">{mode} Waiting Room</h1>
      <p className="mt-4 text-lg text-gray-400">{statusMessage}</p>
      <div className="mt-8 w-16 h-16 border-4 border-dashed rounded-full animate-spin border-green-400"></div>
      <p className="mt-4 text-sm text-gray-500">
        You are <span className="font-bold text-xl text-white">#{queuePosition}</span> out of <span className="font-bold text-xl text-white">{queueTotal}</span> in the queue
      </p>
    </div>
  );
};

export default WaitingRoom;