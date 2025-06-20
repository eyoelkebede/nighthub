import React, { useEffect, useState } from 'react';
// 1. Import useNavigate for navigation and useSearchParams
import { useSearchParams, useNavigate } from 'react-router-dom';

const wsURL = import.meta.env.VITE_WEBSOCKET_URL;

const WaitingRoom: React.FC = () => {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const navigate = useNavigate(); // 2. Initialize the navigate function

  const [queuePosition, setQueuePosition] = useState<number | string>('...');
  const [queueTotal, setQueueTotal] = useState<number | string>('...');
  const [statusMessage, setStatusMessage] = useState('Initializing...');

  useEffect(() => {
    if (!wsURL) {
      console.error('WebSocket URL is not defined in environment variables.');
      setStatusMessage('Configuration error.');
      return;
    }

    const ws = new WebSocket(wsURL);

    ws.onopen = () => {
      console.log('✅ WebSocket connection established');
      setStatusMessage('Connecting to server...');
      const joinMessage = {
        type: 'joinQueue',
        payload: { mode: mode },
      };
      ws.send(JSON.stringify(joinMessage));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('⬅️ Received message from server:', message);

      if (message.type === 'queueUpdate') {
        setQueuePosition(message.payload.position);
        setQueueTotal(message.payload.total);
        setStatusMessage('Searching for a partner...');
      }

      // 3. Handle the new 'matchFound' message
      if (message.type === 'matchFound') {
        setStatusMessage(`Match found! Connecting to room...`);
        // Navigate to the new chat page with the provided room ID
        navigate(`/chat/${message.payload.roomId}`);
      }
    };

    ws.onclose = () => {
      console.log('❌ WebSocket connection closed');
      setStatusMessage('Disconnected. Please refresh.');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setStatusMessage('Connection error.');
    };

    return () => {
      ws.close();
    };
  }, [mode, navigate]); // Add navigate to dependency array

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