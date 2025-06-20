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

const clients = new Map<WebSocket, { id: string; mode?: 'safe' | 'nsfw' }>();
const safeQueue: WebSocket[] = [];
const nsfwQueue: WebSocket[] = [];

// --- NEW: Function to check for and handle matches ---
const checkForMatch = (mode: 'safe' | 'nsfw') => {
    const queue = mode === 'safe' ? safeQueue : nsfwQueue;
    console.log(`Checking for match in ${mode} queue. Size: ${queue.length}`);
    
    if (queue.length >= 2) {
        const user1 = queue.shift()!;
        const user2 = queue.shift()!;

        const user1Info = clients.get(user1)!;
        const user2Info = clients.get(user2)!;

        const roomId = uuidv4();

        console.log(`✅ Match found! Room: ${roomId}, Users: ${user1Info.id}, ${user2Info.id}`);

        // --- ADDED CHECKS HERE ---
        // Before sending, ensure the client's connection is still open.
        if (user1.readyState === WebSocket.OPEN) {
            user1.send(JSON.stringify({ type: 'matchFound', payload: { roomId } }));
        } else {
            console.log(`Could not send match to ${user1Info.id}, connection was not open.`);
        }
        
        if (user2.readyState === WebSocket.OPEN) {
            user2.send(JSON.stringify({ type: 'matchFound', payload: { roomId } }));
        } else {
            console.log(`Could not send match to ${user2Info.id}, connection was not open.`);
        }

        // Update the queue positions for everyone who is still waiting
        broadcastQueueUpdates(mode);
    }
};


const sendQueueUpdate = (ws: WebSocket) => {
  const clientInfo = clients.get(ws);
  if (!clientInfo || !clientInfo.mode) return;

  const queue = clientInfo.mode === 'safe' ? safeQueue : nsfwQueue;
  const position = queue.indexOf(ws) + 1;

  if (position > 0) {
    ws.send(JSON.stringify({
      type: 'queueUpdate',
      payload: {
        position: position,
        total: queue.length,
      },
    }));
  }
};

const broadcastQueueUpdates = (mode: 'safe' | 'nsfw') => {
    const queue = mode === 'safe' ? safeQueue : nsfwQueue;
    queue.forEach(ws => sendQueueUpdate(ws));
};

wss.on('connection', (ws: WebSocket) => {
  const clientId = uuidv4();
  clients.set(ws, { id: clientId });
  console.log(`✅ Client connected: ${clientId}`);

  ws.on('message', (message) => {
    try {
      const parsedMessage = JSON.parse(message.toString());
      const clientInfo = clients.get(ws);

      if (!clientInfo) return;

      if (parsedMessage.type === 'joinQueue' && parsedMessage.payload.mode) {
        const mode = parsedMessage.payload.mode;
        console.log(`➡️ Client ${clientId} wants to join queue: ${mode}`);
        
        clientInfo.mode = mode;

        if (mode === 'safe') {
          safeQueue.push(ws);
          broadcastQueueUpdates('safe');
          checkForMatch('safe'); // --- NEW: Check for a match after joining ---
        } else if (mode === 'nsfw') {
          nsfwQueue.push(ws);
          broadcastQueueUpdates('nsfw');
          checkForMatch('nsfw'); // --- NEW: Check for a match after joining ---
        }
      }
    } catch (error) {
      console.error('Failed to parse message or handle logic:', error);
    }
  });

  ws.on('close', () => {
    const clientInfo = clients.get(ws);
    const clientId = clientInfo?.id || 'unknown';

    const safeIndex = safeQueue.indexOf(ws);
    if (safeIndex > -1) {
        safeQueue.splice(safeIndex, 1);
        broadcastQueueUpdates('safe');
    }

    const nsfwIndex = nsfwQueue.indexOf(ws);
    if (nsfwIndex > -1) {
        nsfwQueue.splice(nsfwIndex, 1);
        broadcastQueueUpdates('nsfw');
    }

    clients.delete(ws);
    console.log(`❌ Client disconnected: ${clientId}`);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error for client:', clients.get(ws)?.id, error);
  });
});

server.listen(port, () => {
  console.log(`[server]: Server (HTTP + WebSocket) is running at http://localhost:${port}`);
});