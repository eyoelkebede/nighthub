import React, { useEffect, useState } from 'react';
// Import a hook from React Router to read URL parameters
import { useSearchParams } from 'react-router-dom';

const WaitingRoom: React.FC = () => {
  // useSearchParams lets us read the "?mode=safe" from the URL
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode'); // Will be 'safe' or 'nsfw'

  const [queuePosition, setQueuePosition] = useState<number | string>('...');
  const [statusMessage, setStatusMessage] = useState('Initializing...');

  useEffect(() => {
    // Establish a WebSocket connection when the component mounts.
    // Make sure to use 'ws://' and not 'http://'.
    const ws = new WebSocket('ws://nighthub-backend-z25y.onrender.com');

    // Handle the connection opening
    ws.onopen = () => {
      console.log('✅ WebSocket connection established');
      setStatusMessage('Connecting to server...');
      
      // Tell the server which queue we want to join
      const joinMessage = {
        type: 'joinQueue',
        payload: { mode: mode },
      };
      ws.send(JSON.stringify(joinMessage));
    };

    // Handle messages received from the server
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('⬅️ Received message from server:', message);

      // We'll add logic here later to handle queue updates, etc.
      if (message.type === 'queueUpdate') {
        setQueuePosition(message.payload.position);
        setStatusMessage('Searching for a partner...');
      }
    };

    // Handle the connection closing
    ws.onclose = () => {
      console.log('❌ WebSocket connection closed');
      setStatusMessage('Disconnected. Please refresh.');
    };

    // Handle connection errors
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setStatusMessage('Connection error.');
    };

    // Clean up the connection when the component unmounts
    return () => {
      ws.close();
    };
  }, [mode]); // The effect re-runs if the 'mode' changes

  return (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center font-sans">
      <h1 className="text-4xl font-bold uppercase tracking-wider">{mode} Waiting Room</h1>
      <p className="mt-4 text-lg text-gray-400">{statusMessage}</p>
      <div className="mt-8 w-16 h-16 border-4 border-dashed rounded-full animate-spin border-green-400"></div>
      <p className="mt-4 text-sm text-gray-500">You are <span className="font-bold text-xl text-white">#{queuePosition}</span> in the queue</p>
    </div>
  );
};

export default WaitingRoom;