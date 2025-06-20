import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

// Extend the WebSocket type to include our custom properties
interface ExtendedWebSocket extends WebSocket {
  id: string;
}

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// --- Refactored In-Memory Data Stores ---
// The main lookup for clients. Key: clientId (string), Value: The WebSocket connection object.
const clients = new Map<string, ExtendedWebSocket>();
// The queues now store the string IDs of the clients, not the full objects.
const safeQueue: string[] = [];
const nsfwQueue: string[] = [];
// Rooms also store client IDs. Key: roomId, Value: array of 2 client IDs.
const rooms = new Map<string, string[]>();

// --- Helper Functions ---

/**
 * Finds the partner's ID for a given user.
 * @param clientId The ID of the user.
 * @returns The ID of the partner, or null if not found.
 */
const getPartnerId = (clientId: string): string | null => {
    for (const userIds of rooms.values()) {
        if (userIds.includes(clientId)) {
            return userIds.find(id => id !== clientId) || null;
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
    console.log(`Checking for match in ${mode} queue. Current size: ${queue.length}`);

    while (queue.length >= 2) {
        const user1Id = queue.shift()!;
        const user2Id = queue.shift()!;

        const user1Ws = clients.get(user1Id);
        const user2Ws = clients.get(user2Id);
        
        // Ensure both clients are still connected before creating the room
        if (!user1Ws || !user2Ws) {
            console.error("A matched user disconnected before room creation. Re-queuing the other if they exist.");
            // If one user disconnected, put the other one back at the front of the queue
            if(user1Ws) queue.unshift(user1Id);
            if(user2Ws) queue.unshift(user2Id);
            return;
        }

        const roomId = uuidv4();
        rooms.set(roomId, [user1Id, user2Id]);

        console.log(`✅ Match found! Room: ${roomId}, Users: ${user1Id}, ${user2Id}`);
        
        const matchFoundPayload = JSON.stringify({ type: 'matchFound', payload: { roomId } });

        if (user1Ws.readyState === WebSocket.OPEN) {
            user1Ws.send(matchFoundPayload);
        }
        if (user2Ws.readyState === WebSocket.OPEN) {
            user2Ws.send(matchFoundPayload);
        }
    }
    // After all matches are made, update everyone still waiting
    broadcastQueueUpdates(mode);
};

/**
 * Sends a queue update to every user in a specific queue.
 * @param mode The queue to broadcast to ('safe' or 'nsfw').
 */
const broadcastQueueUpdates = (mode: 'safe' | 'nsfw') => {
    const queue = mode === 'safe' ? safeQueue : nsfwQueue;
    queue.forEach((clientId, index) => {
        const ws = clients.get(clientId);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'queueUpdate',
              payload: {
                position: index + 1,
                total: queue.length,
              },
            }));
        }
    });
};

// --- Main WebSocket Server Logic ---

wss.on('connection', (ws: WebSocket) => {
  const clientId = uuidv4();
  // Attach the ID directly to the WebSocket object for easy access
  (ws as ExtendedWebSocket).id = clientId;
  // Store the client by its ID
  clients.set(clientId, ws as ExtendedWebSocket);
  console.log(`✅ Client connected: ${clientId}`);

  ws.on('message', (message) => {
    try {
      const parsedMessage = JSON.parse(message.toString());
      const senderId = (ws as ExtendedWebSocket).id;

      // Handle user joining a queue
      if (parsedMessage.type === 'joinQueue' && parsedMessage.payload.mode) {
        const mode = parsedMessage.payload.mode;
        const queue = mode === 'safe' ? safeQueue : nsfwQueue;
        queue.push(senderId);
        checkForMatch(mode);
      }

      // Handle incoming text chat messages
      if (parsedMessage.type === 'chatMessage' && parsedMessage.payload.message) {
        const partnerId = getPartnerId(senderId);
        if (partnerId) {
            const partnerWs = clients.get(partnerId);
            if (partnerWs && partnerWs.readyState === WebSocket.OPEN) {
              partnerWs.send(JSON.stringify({
                type: 'chatMessage',
                payload: { sender: 'partner', message: parsedMessage.payload.message },
              }));
            }
        }
      }

      // Handle WebRTC signaling
      if (parsedMessage.type.startsWith('webrtc-')) {
          const partnerId = getPartnerId(senderId);
          if (partnerId) {
              const partnerWs = clients.get(partnerId);
              if (partnerWs && partnerWs.readyState === WebSocket.OPEN) {
                  // Forward the original message to the partner
                  partnerWs.send(JSON.stringify(parsedMessage));
              }
          }
      }
    } catch (error) {
      console.error('Failed to parse message or handle logic:', error);
    }
  });

  // Handle a client disconnecting
  ws.on('close', () => {
    const clientId = (ws as ExtendedWebSocket).id;
    console.log(`❌ Client disconnected: ${clientId}`);

    // If the user was in a chat room, notify their partner and remove the room
    const partnerId = getPartnerId(clientId);
    if (partnerId) {
        const partnerWs = clients.get(partnerId);
        if (partnerWs && partnerWs.readyState === WebSocket.OPEN) {
            partnerWs.send(JSON.stringify({ type: 'partnerDisconnected' }));
        }
        // Find and delete the room
        for (const [roomId, users] of rooms.entries()) {
          if (users.includes(clientId)) {
              rooms.delete(roomId);
              break;
          }
        }
    }
    
    // Remove the user from any queue they were in
    let queue = safeQueue;
    let index = queue.indexOf(clientId);
    if (index > -1) {
        queue.splice(index, 1);
        broadcastQueueUpdates('safe');
    } else {
        queue = nsfwQueue;
        index = queue.indexOf(clientId);
        if (index > -1) {
            queue.splice(index, 1);
            broadcastQueueUpdates('nsfw');
        }
    }

    // Clean up the main client list
    clients.delete(clientId);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error for client:', (ws as ExtendedWebSocket).id, error);
  });
});

// Start the server
server.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
