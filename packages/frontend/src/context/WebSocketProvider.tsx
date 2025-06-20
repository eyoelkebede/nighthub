import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';

// The URL for our WebSocket server from environment variables
const wsURL = import.meta.env.VITE_WEBSOCKET_URL;

// Define the shape of our context
interface WebSocketContextType {
  isConnected: boolean;
  lastMessage: any | null;
  sendMessage: (message: string) => void;
}

// Create the context with a default value
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
  const [wsInstance, setWsInstance] = useState<WebSocket | null>(null);
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
      setWsInstance(socket);
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('⬅️ Global listener received message:', message);
        setLastMessage(message);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    socket.onclose = () => {
      console.log('❌ Global WebSocket connection closed');
      setIsConnected(false);
      setWsInstance(null);
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

  const sendMessage = useCallback((message: string) => {
    if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
      wsInstance.send(message);
    } else {
      console.error('Cannot send message, WebSocket is not open.');
    }
  }, [wsInstance]);

  // OPTIMIZATION: Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    isConnected,
    lastMessage,
    sendMessage,
  }), [isConnected, lastMessage, sendMessage]);

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
