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
  strikes: number;
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

// --- Bot Personalities & Content ---
const RoeBot = {
    name: "Roe-bot",
    jokes: ["Why don't scientists trust atoms? Because they make up everything!", "I'm on a seafood diet. I see food and I eat it.", "Why did the scarecrow win an award? Because he was outstanding in his field!"],
    questions: ["If you could have any superpower, what would it be?", "What's the best movie you've seen recently?", "Pineapple on pizza: yes or no?"],
    redFlagKeywords: ['address', 'meet up', 'buy drugs', 'adderall', 'percocet'],
};

const safeModeForbiddenWords = ['hate', 'racist', 'nazi', 'kill yourself'];
const nsfwModeForbiddenWords = ['kill', 'murder', 'gore', 'assault', 'redroom'];

// --- Helper Functions ---
const getPartnerId = (clientId: string): string | null => {
    for (const userIds of rooms.values()) {
        if (userIds.includes(clientId)) return userIds.find(id => id !== clientId) || null;
    }
    return null; 
};
const broadcastQueueUpdates = (mode: 'safe' | 'nsfw') => { /* ... unchanged ... */ };
const checkForMatch = (mode: 'safe' | 'nsfw') => { /* ... unchanged ... */ };
const broadcastToWaitingRoom = (message: object, mode: 'safe' | 'nsfw') => {
    const queue = mode === 'safe' ? safeQueue : nsfwQueue;
    const messageString = JSON.stringify(message);
    queue.forEach(clientId => clients.get(clientId)?.send(messageString));
};

let waitingRoomTimer: NodeJS.Timeout;
const resetWaitingRoomTimer = () => {
    clearTimeout(waitingRoomTimer);
    waitingRoomTimer = setTimeout(() => {
        if (safeQueue.length > 1) {
            const question = RoeBot.questions[Math.floor(Math.random() * RoeBot.questions.length)];
            broadcastToWaitingRoom({ type: 'botMessage', payload: { botName: RoeBot.name, message: question }}, 'safe');
            resetWaitingRoomTimer(); // Reset the timer after asking
        }
    }, 120 * 1000); // 2 minutes
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
  extWs.strikes = 0;
  extWs.ip = ip;
  clients.set(clientId, extWs);
  console.log(`✅ Client connected: ${clientId} from IP: ${ip}`);

  ws.on('message', (message) => {
    try {
      const parsedMessage = JSON.parse(message.toString());
      const senderWs = clients.get((ws as ExtendedWebSocket).id);
      if(!senderWs) return;

      // --- Universal Moderation Hook ---
      if (parsedMessage.payload?.message) {
          const content = parsedMessage.payload.message;
          const mode = senderWs.mode;
          let forbiddenList = mode === 'safe' ? safeModeForbiddenWords : nsfwModeForbiddenWords;
          let botName = mode === 'safe' ? RoeBot.name : 'Vesper';

          // Safe mode has an extra layer of checks
          if (mode === 'safe' && RoeBot.redFlagKeywords.some(kw => content.toLowerCase().includes(kw))) {
              console.log(`🚨 SEVERE VIOLATION by ${senderWs.id} (${senderWs.ip}). MSG: "${content}"`);
              const partnerId = getPartnerId(senderWs.id);
              if (partnerId) {
                  const partnerWs = clients.get(partnerId);
                  partnerWs?.send(JSON.stringify({ type: 'botMessage', payload: { botName: RoeBot.name, message: "Your partner's conversation was flagged for a severe violation. You have been disconnected." }}));
                  partnerWs?.close();
              }
              senderWs.send(JSON.stringify({ type: 'botMessage', payload: { botName: RoeBot.name, message: "This conversation has been flagged for a severe violation and is now being reported to our moderation team." }}));
              ws.close();
              return;
          }

          if (forbiddenList.some(word => content.toLowerCase().includes(word))) {
              senderWs.strikes++;
              if (senderWs.strikes >= 3) {
                  const banDuration = 30 * 60 * 1000; // 30 minutes
                  bannedIPs.set(senderWs.ip, { unbanTime: Date.now() + banDuration, reason: "Repeated violations" });
                  senderWs.send(JSON.stringify({ type: 'botMessage', payload: { botName, message: `You have been disconnected and banned for 30 minutes due to repeated violations.` } }));
                  ws.close();
              } else {
                  senderWs.send(JSON.stringify({ type: 'botMessage', payload: { botName, message: `Warning: Your message violates community guidelines. Strike ${senderWs.strikes} of 3.` } }));
              }
              return; // Stop the message from being processed further
          }
      }

      // --- Message Routing ---
      switch (parsedMessage.type) {
        case 'joinQueue':
          const mode = parsedMessage.payload.mode as 'safe' | 'nsfw';
          senderWs.mode = mode;
          if (mode === 'safe') {
              if (!safeQueue.includes(senderWs.id)) safeQueue.push(senderWs.id);
              senderWs.send(JSON.stringify({ type: 'botMessage', payload: { botName: RoeBot.name, message: `Hi there! I'm Roe-bot, your friendly moderator. Remember our 3-strike policy and be excellent to each other! Here's a joke to start: ${RoeBot.jokes[Math.floor(Math.random() * RoeBot.jokes.length)]}` }}));
          } else {
              if (!nsfwQueue.includes(senderWs.id)) nsfwQueue.push(senderWs.id);
          }
          checkForMatch(mode);
          resetWaitingRoomTimer();
          break;
        case 'waitingRoomChat':
            if (senderWs.mode) broadcastToWaitingRoom(parsedMessage, senderWs.mode);
            resetWaitingRoomTimer();
            break;
        case 'chatMessage': { /* ... unchanged ... */ }
        case 'requestNextPartner': { /* ... unchanged ... */ }
      }
    } catch (error) {
      console.error('Failed to process message:', error);
    }
  });

  ws.on('close', () => { /* ... unchanged ... */ });
});

server.listen(port, () => console.log(`[server]: Server is running on port ${port}`));
