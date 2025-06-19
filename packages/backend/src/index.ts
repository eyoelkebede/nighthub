import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http'; // Import the native http module
import { WebSocketServer } from 'ws'; // Import the WebSocket server

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// A simple test route
app.get('/', (req, res) => {
  res.send('Hello from the Nighthub Backend!');
});

// --- WebSocket Setup ---

// 1. Create a standard HTTP server from our Express app
const server = http.createServer(app);

// 2. Create a WebSocket server and attach it to the HTTP server
const wss = new WebSocketServer({ server });

// 3. Define what happens when a client connects
wss.on('connection', (ws) => {
  console.log('✅ Client connected');

  // Define what happens when a message is received from this client
  ws.on('message', (message) => {
    console.log('➡️ Received message:', message.toString());
  });

  // Define what happens when this client disconnects
  ws.on('close', () => {
    console.log('❌ Client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// 4. Start the HTTP server (which also starts the WebSocket server)
server.listen(port, () => {
  console.log(`[server]: Server (HTTP + WebSocket) is running at http://localhost:${port}`);
});