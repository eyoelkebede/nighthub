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
// Add a 'readyForVideo' flag to our client info
const clients = new Map<WebSocket, { id: string; mode?: 'safe' | 'nsfw'; readyForVideo?: boolean }>();
const safeQueue: WebSocket[] = [];
const nsfwQueue: WebSocket[] = [];
const rooms = new Map<string, WebSocket[]>();

// --- Helper Functions ---
const getPartner = (ws: WebSocket): WebSocket | null => {
    for (const users of rooms.values()) {
        if (users.includes(ws)) {
            return users.find(user => user !== ws) || null;
        }
    }
    return null;
}

const checkForMatch = (mode: 'safe' | 'nsfw') => { /* ... no change ... */ };
const sendQueueUpdate = (ws: WebSocket) => { /* ... no change ... */ };
const broadcastQueueUpdates = (mode: 'safe' | 'nsfw') => { /* ... no change ... */ };

// --- WebSocket Server Logic ---
wss.on('connection', (ws: WebSocket) => {
  const clientId = uuidv4();
  clients.set(ws, { id: clientId, readyForVideo: false }); // Set ready flag to false initially
  console.log(`✅ Client connected: ${clientId}`);

  ws.on('message', (message) => {
    try {
      const parsedMessage = JSON.parse(message.toString());
      const clientInfo = clients.get(ws);
      if (!clientInfo) return;

      if (parsedMessage.type === 'joinQueue') { /* ... no change ... */ }
      if (parsedMessage.type === 'chatMessage') { /* ... no change ... */ }
      if (parsedMessage.type.startsWith('webrtc-')) {
          const partner = getPartner(ws);
          if (partner && partner.readyState === WebSocket.OPEN) {
              partner.send(JSON.stringify(parsedMessage));
          }
      }
      
      // --- NEW: Logic for initiating the WebRTC call ---
      if (parsedMessage.type === 'webrtc-ready') {
          console.log(`Client ${clientInfo.id} is ready for video.`);
          clientInfo.readyForVideo = true;
          const partner = getPartner(ws);
          const partnerInfo = partner ? clients.get(partner) : null;

          // If the partner is also ready, tell this client to start the call
          if (partner && partnerInfo?.readyForVideo) {
              console.log(`Both clients are ready. Telling ${clientInfo.id} to create the offer.`);
              if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ type: 'webrtc-create-offer' }));
              }
          }
      }

    } catch (error) {
      console.error('Failed to parse message or handle logic:', error);
    }
  });

  ws.on('close', () => { /* ... no change ... */ });
  ws.on('error', (error) => { /* ... no change ... */ });
});

server.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});