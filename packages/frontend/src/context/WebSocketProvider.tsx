import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

// The URL for our WebSocket server from environment variables
const wsURL = import.meta.env.VITE_WEBSOCKET_URL;

// Define the shape of our context
interface WebSocketContextType {
  ws: WebSocket | null;
  isConnected: boolean;
  lastMessage: any | null; // We'll store the last received message
  sendMessage: (message: string) => void;
}

// Create the context with a default value of null
const WebSocketContext = createContext<WebSocketContextType | null>(null);

// Create a custom hook for easy access to the context
export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

// Create the Provider component
export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any | null>(null);

  useEffect(() => {
    if (!wsURL) {
      console.error('WebSocket URL is not defined in environment variables.');
      return;
    }

    const socket = new WebSocket(wsURL);

    socket.onopen = () => {
      console.log('✅ Global WebSocket connection established');
      setIsConnected(true);
      setWs(socket);
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('⬅️ Global listener received message:', message);
      setLastMessage(message);
    };

    socket.onclose = () => {
      console.log('❌ Global WebSocket connection closed');
      setIsConnected(false);
      setWs(null);
    };

    socket.onerror = (error) => {
      console.error('Global WebSocket error:', error);
      setIsConnected(false);
    };
    
    // Cleanup on component unmount
    return () => {
      socket.close();
    };
  }, []);

  const sendMessage = (message: string) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    } else {
      console.error('Cannot send message, WebSocket is not open.');
    }
  };

  const value = {
    ws,
    isConnected,
    lastMessage,
    sendMessage,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};