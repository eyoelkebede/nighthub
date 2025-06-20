import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

// Get the WebSocket URL from the environment variables
const wsURL = import.meta.env.VITE_WEBSOCKET_URL;

const WaitingRoom: React.FC = () => {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');

  const [queuePosition, setQueuePosition] = useState<number | string>('...');
  const [statusMessage, setStatusMessage] = useState('Initializing...');

  useEffect(() => {
    // First, check if the URL is defined.
    if (!wsURL) {
      console.error('WebSocket URL is not defined in environment variables.');
      setStatusMessage('Configuration error.');
      return;
    }

    const ws = new WebSocket(wsURL); // Use the variable here

    ws.onopen = () => {
      // ... rest of the code is the same
      console.log('✅ WebSocket connection established');
      setStatusMessage('Connecting to server...');
      const joinMessage = {
        type: 'joinQueue',
        payload: { mode: mode },
      };
      ws.send(JSON.stringify(joinMessage));
    };

    // ... rest of the file is the same ...
    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log('⬅️ Received message from server:', message);
        if (message.type === 'queueUpdate') {
          setQueuePosition(message.payload.position);
          setStatusMessage('Searching for a partner...');
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
  }, [mode]);

  return (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center font-sans">
      {/* ... The JSX part of the component is the same ... */}
      <h1 className="text-4xl font-bold uppercase tracking-wider">{mode} Waiting Room</h1>
      <p className="mt-4 text-lg text-gray-400">{statusMessage}</p>
      <div className="mt-8 w-16 h-16 border-4 border-dashed rounded-full animate-spin border-green-400"></div>
      <p className="mt-4 text-sm text-gray-500">You are <span className="font-bold text-xl text-white">#{queuePosition}</span> in the queue</p>
    </div>
  );
};

export default WaitingRoom;