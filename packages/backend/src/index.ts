import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

// Standard HTTP Server Middleware
app.use(cors());
app.use(express.json());

// Create the main HTTP server from our Express app
const server = http.createServer(app);
// Attach the WebSocket server to the HTTP server
const wss = new WebSocketServer({ server });

// --- In-Memory Data Stores ---
// We store info about every connected client
const clients = new Map<WebSocket, { id: string; mode?: 'safe' | 'nsfw'; readyForVideo?: boolean }>();
// Queues for waiting users
const safeQueue: WebSocket[] = [];
const nsfwQueue: WebSocket[] = [];
// Map of active chat rooms
const rooms = new Map<string, WebSocket[]>();

// --- Helper Functions ---

/**
 * Finds the partner of a given user in a chat room.
 * @param ws The WebSocket connection of the user.
 * @returns The WebSocket connection of the partner, or null if not found.
 */
const getPartner = (ws: WebSocket): WebSocket | null => {
    for (const users of rooms.values()) {
        if (users.includes(ws)) {
            return users.find(user => user !== ws) || null;
        }
    }
    return null;
}

/**
 * Checks a queue for a potential match and initiates it.
 * @param mode The queue to check ('safe' or 'nsfw').
 */
const checkForMatch = (mode: 'safe' | 'nsfw') => {
    const queue = mode === 'safe' ? safeQueue : nsfwQueue;
    console.log(`Checking for match in ${mode} queue. Size: ${queue.length}`);
    
    if (queue.length >= 2) {
        // Pull the first two users from the queue
        const user1 = queue.shift()!;
        const user2 = queue.shift()!;

        // Create a unique room ID for their private chat
        const roomId = uuidv4();
        
        // Create the room and add the users to it
        rooms.set(roomId, [user1, user2]);

        console.log(`✅ Match found! Room: ${roomId}`);
        
        // Notify both users that a match was found and provide the room ID
        if (user1.readyState === WebSocket.OPEN) {
            user1.send(JSON.stringify({ type: 'matchFound', payload: { roomId } }));
        }
        if (user2.readyState === WebSocket.OPEN) {
            user2.send(JSON.stringify({ type: 'matchFound', payload: { roomId } }));
        }

        // Update queue positions for everyone still waiting
        broadcastQueueUpdates(mode);
    }
};

/**
 * Sends a user their current position in the queue.
 * @param ws The user's WebSocket connection.
 */
const sendQueueUpdate = (ws: WebSocket) => {
  const clientInfo = clients.get(ws);
  if (!clientInfo || !clientInfo.mode) return;

  const queue = clientInfo.mode === 'safe' ? safeQueue : nsfwQueue;
  const position = queue.indexOf(ws) + 1;

  if (position > 0 && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'queueUpdate',
      payload: {
        position: position,
        total: queue.length,
      },
    }));
  }
};

/**
 * Sends a queue update to every user in a specific queue.
 * @param mode The queue to broadcast to ('safe' or 'nsfw').
 */
const broadcastQueueUpdates = (mode: 'safe' | 'nsfw') => {
    const queue = mode === 'safe' ? safeQueue : nsfwQueue;
    queue.forEach(ws => sendQueueUpdate(ws));
};

// --- Main WebSocket Server Logic ---

wss.on('connection', (ws: WebSocket) => {
  // When a new user connects, assign them a unique ID and mark them as not ready for video
  const clientId = uuidv4();
  clients.set(ws, { id: clientId, readyForVideo: false });
  console.log(`✅ Client connected: ${clientId}`);

  // Handle incoming messages from this specific client
  ws.on('message', (message) => {
    try {
      const parsedMessage = JSON.parse(message.toString());
      const clientInfo = clients.get(ws);
      if (!clientInfo) return;

      // Handle user joining a queue
      if (parsedMessage.type === 'joinQueue' && parsedMessage.payload.mode) {
        const mode = parsedMessage.payload.mode;
        clientInfo.mode = mode;
        const queue = mode === 'safe' ? safeQueue : nsfwQueue;
        queue.push(ws);
        broadcastQueueUpdates(mode);
        checkForMatch(mode);
      }

      // Handle incoming text chat messages
      if (parsedMessage.type === 'chatMessage' && parsedMessage.payload.message) {
        const partner = getPartner(ws);
        if (partner && partner.readyState === WebSocket.OPEN) {
          partner.send(JSON.stringify({
            type: 'chatMessage',
            payload: { sender: 'partner', message: parsedMessage.payload.message },
          }));
        }
      }

      // Handle WebRTC signaling messages (offer, answer, ICE candidates)
      if (parsedMessage.type.startsWith('webrtc-') && parsedMessage.type !== 'webrtc-ready') {
          const partner = getPartner(ws);
          if (partner && partner.readyState === WebSocket.OPEN) {
              // Simply forward the signaling message to the partner
              partner.send(JSON.stringify(parsedMessage));
          }
      }
      
      // Handle client indicating they are ready for video
      if (parsedMessage.type === 'webrtc-ready') {
          console.log(`Client ${clientInfo.id} is ready for video.`);
          clientInfo.readyForVideo = true;
          const partner = getPartner(ws);
          const partnerInfo = partner ? clients.get(partner) : null;

          // If their partner is also ready, tell this client (the second one to be ready) to create the offer
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

  // Handle a client disconnecting
  ws.on('close', () => {
    const clientInfo = clients.get(ws);
    const clientId = clientInfo?.id || 'unknown';

    // If the user was in a chat room, notify their partner and remove the room
    const partner = getPartner(ws);
    if (partner && partner.readyState === WebSocket.OPEN) {
      partner.send(JSON.stringify({ type: 'partnerDisconnected' }));
      for (const [roomId, users] of rooms.entries()) {
          if (users.includes(ws)) {
              rooms.delete(roomId);
              break;
          }
      }
    }
    
    // Remove the user from any queue they were in
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

    // Clean up the main client list
    clients.delete(ws);
    console.log(`❌ Client disconnected: ${clientId}`);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error for client:', clients.get(ws)?.id, error);
  });
});

// Start the server
server.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});