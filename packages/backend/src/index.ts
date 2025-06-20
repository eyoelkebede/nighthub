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

const clients = new Map<string, ExtendedWebSocket>();
const safeQueue: string[] = [];
const nsfwQueue: string[] = [];
const rooms = new Map<string, string[]>();

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
    console.log(`Checking for match in ${mode} queue. Size: ${queue.length}`);
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
        
        console.log(`✅ Match found! Room: ${roomId}, Users: ${user1Id}, ${user2Id}`);
        const matchFoundPayload = JSON.stringify({ type: 'matchFound', payload: { roomId } });
        user1Ws.send(matchFoundPayload);
        user2Ws.send(matchFoundPayload);
    }
    broadcastQueueUpdates(mode);
};

const broadcastToWaitingRoom = (message: object, mode: 'safe' | 'nsfw') => {
    const queue = mode === 'safe' ? safeQueue : nsfwQueue;
    const messageString = JSON.stringify(message);
    queue.forEach(clientId => {
        const ws = clients.get(clientId);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(messageString);
        }
    });
};

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
        case 'joinQueue': {
          const mode = parsedMessage.payload.mode as 'safe' | 'nsfw';
          senderWs.mode = mode;
          const queue = mode === 'safe' ? safeQueue : nsfwQueue;
          if (!queue.includes(senderWs.id)) queue.push(senderWs.id);
          checkForMatch(mode);
          break;
        }
        case 'waitingRoomChat': {
          const senderMode = senderWs.mode;
          if (!senderMode) return;
          const { username, message: chatMessage } = parsedMessage.payload;
          broadcastToWaitingRoom({
              type: 'waitingRoomChat',
              payload: { senderId: senderWs.id, username, message: chatMessage }
          }, senderMode);
          break;
        }
        case 'chatMessage': {
          const partnerId = getPartnerId(senderWs.id);
          if (partnerId) {
              const partnerWs = clients.get(partnerId);
              if (partnerWs?.readyState === WebSocket.OPEN) {
                partnerWs.send(JSON.stringify({
                  type: 'chatMessage',
                  payload: { message: parsedMessage.payload.message },
                }));
              }
          }
          break;
        }
        case 'requestNextPartner': {
            const oldPartnerId = getPartnerId(senderWs.id);
            if (oldPartnerId) {
                const oldPartnerWs = clients.get(oldPartnerId);
                if (oldPartnerWs?.readyState === WebSocket.OPEN) {
                    oldPartnerWs.send(JSON.stringify({ type: 'partnerDisconnected' }));
                }
            }
            for (const [roomId, users] of rooms.entries()) {
                if (users.includes(senderWs.id)) {
                    rooms.delete(roomId);
                    break;
                }
            }
            const mode = senderWs.mode || 'safe';
            const queue = mode === 'safe' ? safeQueue : nsfwQueue;
            if(!queue.includes(senderWs.id)) {
                queue.push(senderWs.id);
            }
            senderWs.send(JSON.stringify({ type: 'requeued' }));
            checkForMatch(mode);
            break;
        }
      }
    } catch (error) {
      console.error('Failed to process message:', error);
    }
  });

  ws.on('close', () => {
    const clientId = (ws as ExtendedWebSocket).id;
    const partnerId = getPartnerId(clientId);
    if (partnerId) {
      const partnerWs = clients.get(partnerId);
      if (partnerWs?.readyState === WebSocket.OPEN) {
        partnerWs.send(JSON.stringify({ type: 'partnerDisconnected' }));
      }
      for (const [roomId, users] of rooms.entries()) {
        if (users.includes(clientId)) rooms.delete(roomId);
      }
    }
    let index = safeQueue.indexOf(clientId);
    if (index > -1) {
      safeQueue.splice(index, 1);
      broadcastQueueUpdates('safe');
    }
    index = nsfwQueue.indexOf(clientId);
    if (index > -1) {
      nsfwQueue.splice(index, 1);
      broadcastQueueUpdates('nsfw');
    }
    clients.delete(clientId);
    console.log(`❌ Client disconnected: ${clientId}`);
  });
});

server.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
