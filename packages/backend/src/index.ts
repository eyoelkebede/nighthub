import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// --- Data Stores ---
const clients = new Map<WebSocket, { id: string; mode?: 'safe' | 'nsfw' }>();
const safeQueue: WebSocket[] = [];
const nsfwQueue: WebSocket[] = [];
// NEW: Map to store active chat rooms. Key: roomId, Value: array of 2 WebSockets
const rooms = new Map<string, WebSocket[]>();

// --- Functions ---
const checkForMatch = (mode: 'safe' | 'nsfw') => {
    const queue = mode === 'safe' ? safeQueue : nsfwQueue;
    if (queue.length >= 2) {
        const user1 = queue.shift()!;
        const user2 = queue.shift()!;
        const roomId = uuidv4();
        
        // NEW: Create the room
        rooms.set(roomId, [user1, user2]);

        console.log(`✅ Match found! Room: ${roomId}`);
        
        if (user1.readyState === WebSocket.OPEN) {
            user1.send(JSON.stringify({ type: 'matchFound', payload: { roomId } }));
        }
        if (user2.readyState === WebSocket.OPEN) {
            user2.send(JSON.stringify({ type: 'matchFound', payload: { roomId } }));
        }
        broadcastQueueUpdates(mode);
    }
};

const sendQueueUpdate = (ws: WebSocket) => { /* ... no change ... */ };
const broadcastQueueUpdates = (mode: 'safe' | 'nsfw') => { /* ... no change ... */ };

// --- WebSocket Server Logic ---
wss.on('connection', (ws: WebSocket) => {
  const clientId = uuidv4();
  clients.set(ws, { id: clientId });
  console.log(`✅ Client connected: ${clientId}`);

  ws.on('message', (message) => {
    try {
      const parsedMessage = JSON.parse(message.toString());
      const clientInfo = clients.get(ws);
      if (!clientInfo) return;

      // Logic for joining a queue
      if (parsedMessage.type === 'joinQueue' && parsedMessage.payload.mode) {
        const mode = parsedMessage.payload.mode;
        clientInfo.mode = mode;
        const queue = mode === 'safe' ? safeQueue : nsfwQueue;
        queue.push(ws);
        broadcastQueueUpdates(mode);
        checkForMatch(mode);
      }

      // --- NEW: Logic for handling chat messages ---
      if (parsedMessage.type === 'chatMessage' && parsedMessage.payload.message) {
        // Find which room the sender is in
        let currentRoomId: string | null = null;
        let partner: WebSocket | null = null;
        
        for (const [roomId, users] of rooms.entries()) {
          if (users.includes(ws)) {
            currentRoomId = roomId;
            partner = users.find(user => user !== ws) || null;
            break;
          }
        }

        // If they have a partner, forward the message
        if (partner && partner.readyState === WebSocket.OPEN) {
          const forwardedMessage = {
            type: 'chatMessage',
            payload: {
              sender: 'partner',
              message: parsedMessage.payload.message,
            },
          };
          partner.send(JSON.stringify(forwardedMessage));
        }
      }

    } catch (error) {
      console.error('Failed to parse message or handle logic:', error);
    }
  });

  ws.on('close', () => {
    // --- NEW: Handle disconnection from a chat room ---
    let partnerToNotify: WebSocket | null = null;
    let roomToDelete: string | null = null;

    for (const [roomId, users] of rooms.entries()) {
      if (users.includes(ws)) {
        roomToDelete = roomId;
        partnerToNotify = users.find(user => user !== ws) || null;
        break;
      }
    }
    
    if (roomToDelete) {
      rooms.delete(roomToDelete);
      if (partnerToNotify && partnerToNotify.readyState === WebSocket.OPEN) {
        partnerToNotify.send(JSON.stringify({ type: 'partnerDisconnected' }));
      }
    }
    
    // ... rest of disconnection logic is the same ...
    const clientInfo = clients.get(ws);
    const clientId = clientInfo?.id || 'unknown';
    // ... queue removal logic ...
    clients.delete(ws);
    console.log(`❌ Client disconnected: ${clientId}`);
  });

  ws.on('error', (error) => { /* ... no change ... */ });
});

server.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});