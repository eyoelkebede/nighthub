import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

interface ExtendedWebSocket extends WebSocket {
  id: string;
  mode?: 'safe' | 'nsfw';
}

dotenv.config();
const app = express();
const port = process.env.PORT || 8080;
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Data Stores
const clients = new Map<string, ExtendedWebSocket>();
const safeQueue: string[] = [];
const nsfwQueue: string[] = [];
const rooms = new Map<string, string[]>();

// Profanity Filter
const forbiddenWords = ['badword1', 'badword2'];
const containsForbiddenWord = (message: string): boolean => {
    return forbiddenWords.some(word => message.toLowerCase().includes(word));
};

// --- Helper Functions ---

// FIX: Added a return null at the end of the function
const getPartnerId = (clientId: string): string | null => {
    for (const userIds of rooms.values()) {
        if (userIds.includes(clientId)) {
            return userIds.find(id => id !== clientId) || null;
        }
    }
    return null; 
}

const broadcastQueueUpdates = (mode: 'safe' | 'nsfw') => {
    const queue = mode === 'safe' ? safeQueue : nsfwQueue;
    queue.forEach((clientId, index) => {
        const ws = clients.get(clientId);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'queueUpdate',
              payload: { position: index + 1, total: queue.length },
            }));
        }
    });
};

const checkForMatch = (mode: 'safe' | 'nsfw') => { /* ... no change from previous correct version ... */ };

// NEW: Separated broadcast functions for each waiting room chat
const broadcastToWaitingRoom = (message: object, mode: 'safe' | 'nsfw') => {
    const queue = mode === 'safe' ? safeQueue : nsfwQueue;
    const messageString = JSON.stringify(message);
    
    queue.forEach(clientId => {
        const ws = clients.get(clientId);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(messageString);
        }
    });
}

// --- Main WebSocket Server Logic ---

wss.on('connection', (ws: WebSocket) => {
  const clientId = uuidv4();
  (ws as ExtendedWebSocket).id = clientId;
  clients.set(clientId, ws as ExtendedWebSocket);
  console.log(`✅ Client connected: ${clientId}`);

  ws.on('message', (message) => {
    try {
      const parsedMessage = JSON.parse(message.toString());
      const senderWs = clients.get((ws as ExtendedWebSocket).id);
      if(!senderWs) return;

      switch(parsedMessage.type) {
        case 'joinQueue':
          const mode = parsedMessage.payload.mode as 'safe' | 'nsfw';
          senderWs.mode = mode;
          const queue = mode === 'safe' ? safeQueue : nsfwQueue;
          if (!queue.includes(senderWs.id)) queue.push(senderWs.id);
          checkForMatch(mode);
          break;

        case 'waitingRoomChat':
          const senderMode = senderWs.mode;
          if (!senderMode) return; // Ignore chat if user isn't in a queue

          const { username, message: chatMessage } = parsedMessage.payload;
          
          if (containsForbiddenWord(chatMessage)) {
            senderWs.send(JSON.stringify({ type: 'systemMessage', payload: { text: 'Your message was removed.' } }));
            return;
          }

          // FIX: Call the broadcast function for the specific mode
          broadcastToWaitingRoom({
              type: 'waitingRoomChat',
              payload: { senderId: senderWs.id, username, message: chatMessage }
          }, senderMode);
          break;
        
        // Other cases ('chatMessage', 'requestNextPartner') remain unchanged
        case 'chatMessage': { /* ... */ }
        case 'requestNextPartner': { /* ... */ }
      }
    } catch (error) {
      console.error('Failed to process message:', error);
    }
  });

  ws.on('close', () => { /* ... no change ... */ });
});

server.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
