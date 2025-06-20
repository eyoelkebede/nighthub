import React from 'react';
// useParams lets us read parameters from the URL, like the room ID
import { useParams } from 'react-router-dom';

const ChatPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();

  return (
    <div className="bg-gray-800 text-white min-h-screen flex flex-col items-center justify-center font-sans">
      <h1 className="text-4xl font-bold">Chat Room</h1>
      <p className="mt-4 text-lg text-gray-400">You are now in a private chat.</p>
      <p className="mt-2 text-sm text-gray-500 bg-gray-700 px-2 py-1 rounded">
        Room ID: {roomId}
      </p>
    </div>
  );
};

export default ChatPage;