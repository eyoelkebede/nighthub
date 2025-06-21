import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

// --- Types and Interfaces ---
interface ExtendedWebSocket extends WebSocket {
  id: string;
  mode?: 'safe' | 'nsfw';
  ip: string;
}

interface BanRecord {
  unbanTime: number;
  reason: string;
}

// --- Configuration ---
dotenv.config();
const app = express();
const port = process.env.PORT || 8080;
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// --- Data Stores ---
const clients = new Map<string, ExtendedWebSocket>();
const safeQueue: string[] = [];
const nsfwQueue: string[] = [];
const rooms = new Map<string, string[]>();
const bannedIPs = new Map<string, BanRecord>();

// --- Helper Functions ---

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

const checkForMatch = (mode: 'safe' | 'nsfw') => {
    const queue = mode === 'safe' ? safeQueue : nsfwQueue;
    while (queue.length >= 2) {
        const user1Id = queue.shift()!;
        const user2Id = queue.shift()!;
        const user1Ws = clients.get(user1Id);
        const user2Ws = clients.get(user2Id);
        
        if (!user1Ws || !user2Ws) {
            if(user1Ws) queue.unshift(user1Id);
            if(user2Ws) queue.unshift(user2Id);
            continue;
        }

        const roomId = uuidv4();
        rooms.set(roomId, [user1Id, user2Id]);
        user1Ws.mode = undefined;
        user2Ws.mode = undefined;

        console.log(`✅ Match found! Room: ${roomId}, Users: ${user1Id}, ${user2Id}`);
        const matchFoundPayload = JSON.stringify({ type: 'matchFound', payload: { roomId } });
        if (user1Ws.readyState === WebSocket.OPEN) user1Ws.send(matchFoundPayload);
        if (user2Ws.readyState === WebSocket.OPEN) user2Ws.send(matchFoundPayload);
    }
    broadcastQueueUpdates(mode);
};

const broadcastToWaitingRoom = (message: object, mode: 'safe' | 'nsfw') => {
    const queue = mode === 'safe' ? safeQueue : nsfwQueue;
    const messageString = JSON.stringify(message);
    queue.forEach(clientId => clients.get(clientId)?.send(messageString));
};

// --- Main WebSocket Server Logic ---

wss.on('connection', (ws: WebSocket, req) => {
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress || 'unknown';
  
  const banRecord = bannedIPs.get(ip);
  if (banRecord && Date.now() < banRecord.unbanTime) {
      ws.close(1008, `You are temporarily banned. Reason: ${banRecord.reason}`);
      return;
  }
  bannedIPs.delete(ip);

  const clientId = uuidv4();
  const extWs = ws as ExtendedWebSocket;
  extWs.id = clientId;
  extWs.ip = ip;
  clients.set(clientId, extWs);
  console.log(`✅ Client connected: ${clientId} from IP: ${ip}`);

  ws.on('message', (message) => {
    try {
      const parsedMessage = JSON.parse(message.toString());
      const senderWs = clients.get((ws as ExtendedWebSocket).id);
      if(!senderWs) return;
      const senderId = senderWs.id;

      switch(parsedMessage.type) {
        case 'joinQueue': { /* ... as before ... */ break; }
        case 'waitingRoomChat': { /* ... as before ... */ break; }
        case 'chatMessage': { /* ... as before ... */ break; }
        case 'requestNextPartner': { /* ... as before ... */ break; }

        // --- NEW: Logic to handle a user report ---
        case 'reportUser': {
            const reporterId = senderId;
            const reportedPartnerId = getPartnerId(reporterId);

            if (reportedPartnerId) {
                const reportedWs = clients.get(reportedPartnerId);

                if (reportedWs) {
                    // Log the incident for moderation review
                    console.log(`🚨 USER REPORT: Reporter ${reporterId} (${senderWs.ip}) reported user ${reportedPartnerId} (${reportedWs.ip}).`);
                    
                    // Apply a 1-hour ban to the reported user's IP
                    const banDuration = 60 * 60 * 1000; // 1 hour
                    bannedIPs.set(reportedWs.ip, { unbanTime: Date.now() + banDuration, reason: "Reported by partner." });

                    // Disconnect the reported user
                    reportedWs.close(1008, "You have been reported for violating the Terms of Service and have been disconnected.");
                }

                // Send confirmation to the reporter, their frontend will handle the rest
                senderWs.send(JSON.stringify({ type: 'reportConfirmed' }));

                // Clean up the room
                for (const [roomId, users] of rooms.entries()) {
                    if (users.includes(reporterId)) {
                        rooms.delete(roomId);
                        break;
                    }
                }
            }
            break;
        }
      }
    } catch (error) {
      console.error('Failed to process message:', error);
    }
  });

  ws.on('close', () => { /* ... as before ... */ });
});

server.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
