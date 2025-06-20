import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../context/WebSocketProvider';

const WaitingRoom: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { lastMessage, sendMessage, isConnected } = useWebSocket();

  const mode = searchParams.get('mode') || 'safe'; // Default to safe mode
  const [queuePosition, setQueuePosition] = useState<number | string>('...');
  const [queueTotal, setQueueTotal] = useState<number | string>('...');
  const [statusMessage, setStatusMessage] = useState('Connecting to server...');

  // Effect 1: Join the queue when the component mounts and the WebSocket is connected.
  useEffect(() => {
    if (isConnected) {
      setStatusMessage('Joining queue...');
      sendMessage(JSON.stringify({
        type: 'joinQueue',
        payload: { mode },
      }));
    }
  }, [isConnected, mode, sendMessage]);

  // Effect 2: Listen for messages from the server.
  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'queueUpdate') {
        setQueuePosition(lastMessage.payload.position);
        setQueueTotal(lastMessage.payload.total);
        setStatusMessage('Searching for a partner...');
      }
      
      // CRITICAL: Only navigate when a match is explicitly found.
      if (lastMessage.type === 'matchFound') {
        setStatusMessage(`Match found! Connecting...`);
        navigate(`/chat/${lastMessage.payload.roomId}?mode=${mode}`);
      }
    }
  }, [lastMessage, navigate, mode]);

  return (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center font-sans p-4 text-center">
      <h1 className="text-4xl md:text-5xl font-bold uppercase tracking-wider text-green-400">
        {mode} Waiting Room
      </h1>
      <p className="mt-4 text-lg text-gray-400">{statusMessage}</p>
      
      <div className="mt-12 w-20 h-20 border-4 border-dashed rounded-full animate-spin border-green-400"></div>

      <p className="mt-12 text-md text-gray-500">
        Your Position in Queue
      </p>
      <div className="mt-2 text-4xl font-bold">
        <span className="text-white">{queuePosition}</span>
        <span className="text-gray-600 mx-2">/</span>
        <span className="text-gray-400">{queueTotal}</span>
      </div>
    </div>
  );
};

export default WaitingRoom;
