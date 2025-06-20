import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid'; // Import the UUID generator

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// --- In-memory data stores for our queues ---
// We use a Map to store extended information about each WebSocket client
const clients = new Map<WebSocket, { id: string; mode?: 'safe' | 'nsfw' }>();
const safeQueue: WebSocket[] = [];
const nsfwQueue: WebSocket[] = [];

// --- Functions to manage queues and matching ---

// Function to send a queue position update to a specific client
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

// Function to broadcast queue updates to everyone in a specific queue
const broadcastQueueUpdates = (mode: 'safe' | 'nsfw') => {
    const queue = mode === 'safe' ? safeQueue : nsfwQueue;
    queue.forEach(ws => sendQueueUpdate(ws));
};

// --- WebSocket Server Logic ---

wss.on('connection', (ws: WebSocket) => {
  // Assign a unique ID to each new connection
  const clientId = uuidv4();
  clients.set(ws, { id: clientId });
  console.log(`✅ Client connected: ${clientId}`);

  ws.on('message', (message) => {
    try {
      const parsedMessage = JSON.parse(message.toString());
      const clientInfo = clients.get(ws);

      if (!clientInfo) return;

      // Handle 'joinQueue' message from client
      if (parsedMessage.type === 'joinQueue' && parsedMessage.payload.mode) {
        const mode = parsedMessage.payload.mode;
        console.log(`➡️ Client ${clientId} wants to join queue: ${mode}`);
        
        clientInfo.mode = mode; // Store the user's chosen mode

        if (mode === 'safe') {
          safeQueue.push(ws);
          broadcastQueueUpdates('safe');
        } else if (mode === 'nsfw') {
          nsfwQueue.push(ws);
          broadcastQueueUpdates('nsfw');
        }
      }
    } catch (error) {
      console.error('Failed to parse message or handle logic:', error);
    }
  });

  ws.on('close', () => {
    const clientInfo = clients.get(ws);
    const clientId = clientInfo?.id || 'unknown';

    // Remove client from any queue they might be in
    const safeIndex = safeQueue.indexOf(ws);
    if (safeIndex > -1) {
        safeQueue.splice(safeIndex, 1);
        broadcastQueueUpdates('safe'); // Update everyone else in the queue
    }

    const nsfwIndex = nsfwQueue.indexOf(ws);
    if (nsfwIndex > -1) {
        nsfwQueue.splice(nsfwIndex, 1);
        broadcastQueueUpdates('nsfw');
    }

    clients.delete(ws); // Remove client from our main list
    console.log(`❌ Client disconnected: ${clientId}`);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error for client:', clients.get(ws)?.id, error);
  });
});

server.listen(port, () => {
  console.log(`[server]: Server (HTTP + WebSocket) is running at http://localhost:${port}`);
});