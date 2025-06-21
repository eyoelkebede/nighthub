import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import Stripe from 'stripe';
import { Pool } from 'pg';

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

// --- Environment Variables ---
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://nighthub:2URr-RxtqnmA-9QBToci5g@ragged-pony-12360.j77.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full";
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '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';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_...';
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || 'price_...';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://nighthub.io';

// --- Database & Stripe Initialization ---
const pool = new Pool({ connectionString: DATABASE_URL });
const stripe = new Stripe(STRIPE_SECRET_KEY);

// --- Express Middleware Setup ---
// The raw body parser for the webhook MUST come BEFORE express.json()
app.post('/webhook', express.raw({ type: 'application/json' }), (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;
    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        res.status(400).send(`Webhook Error: ${(err as Error).message}`);
        return;
    }
    (async () => {
        try {
            const subscription = event.data.object as Stripe.Subscription;
            const customerId = subscription.customer as string;
            const newStatus = subscription.status === 'active' ? 'active' : 'inactive';
            
            switch (event.type) {
                case 'customer.subscription.created':
                case 'customer.subscription.updated':
                    await pool.query("UPDATE users SET subscription_status = $1 WHERE stripe_customer_id = $2", [newStatus, customerId]);
                    console.log(`Updated subscription status to ${newStatus} for customer ${customerId}`);
                    break;
                case 'customer.subscription.deleted':
                    await pool.query("UPDATE users SET subscription_status = 'canceled' WHERE stripe_customer_id = $2", [customerId]);
                    console.log(`Canceled subscription for customer ${customerId}`);
                    break;
            }
        } catch (error) {
            console.error("Webhook DB error:", error);
        }
        res.json({ received: true });
    })();
});

// Standard middleware
app.use(cors());
app.use(express.json());

// --- REST API Routes ---

app.get('/check-subscription-status/:userId', (req: Request, res: Response) => {
    const { userId } = req.params;
    pool.query('SELECT subscription_status FROM users WHERE id = $1', [userId])
        .then(result => {
            if (result.rows.length > 0 && result.rows[0].subscription_status === 'active') {
                res.json({ isSubscribed: true });
            } else {
                res.json({ isSubscribed: false });
            }
        })
        .catch(() => {
            res.status(500).json({ error: 'Database error' });
        });
});

app.post('/create-checkout-session', async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.body;
    if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
    }
    try {
        let userResult = await pool.query('SELECT stripe_customer_id FROM users WHERE id = $1', [userId]);
        let customerId: string;
        if (userResult.rows.length === 0) {
            await pool.query('INSERT INTO users (id) VALUES ($1)', [userId]);
            const customer = await stripe.customers.create({ metadata: { nighthub_user_id: userId } });
            customerId = customer.id;
            await pool.query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customerId, userId]);
        } else {
            customerId = userResult.rows[0].stripe_customer_id;
            if (!customerId) {
                const customer = await stripe.customers.create({ metadata: { nighthub_user_id: userId } });
                customerId = customer.id;
                await pool.query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customerId, userId]);
            }
        }
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            customer: customerId,
            line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
            success_url: `${FRONTEND_URL}/`,
            cancel_url: `${FRONTEND_URL}/`,
        });
        res.json({ url: session.url });
    } catch (error) {
        res.status(500).json({ error: { message: (error as Error).message } });
    }
});

app.post('/customer-portal', async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.body;
    try {
        const userResult = await pool.query('SELECT stripe_customer_id FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0 || !userResult.rows[0].stripe_customer_id) {
            res.status(404).json({ error: 'User not found or has no subscription.' });
            return;
        }
        const customerId = userResult.rows[0].stripe_customer_id;
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${FRONTEND_URL}/`,
        });
        res.json({ url: portalSession.url });
    } catch (error) {
        res.status(500).json({ error: { message: (error as Error).message } });
    }
});

// --- WebSocket Server Initialization & Logic ---
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const clients = new Map<string, ExtendedWebSocket>();
const safeQueue: string[] = [];
const nsfwQueue: string[] = [];
const rooms = new Map<string, string[]>();
const bannedIPs = new Map<string, BanRecord>();

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

        // --- CORRECTED: Restored the full logic for all cases ---

        case 'joinQueue': {

          const mode = parsedMessage.payload.mode as 'safe' | 'nsfw';

          senderWs.mode = mode;

          const queue = mode === 'safe' ? safeQueue : nsfwQueue;

          if (!queue.includes(senderId)) {

            queue.push(senderId);

          }

          broadcastQueueUpdates(mode);

          checkForMatch(mode);

          break;

        }

        case 'waitingRoomChat': {

            const senderMode = senderWs.mode;

            if (!senderMode) return;

            broadcastToWaitingRoom(parsedMessage, senderMode);

            break;

        }

        case 'chatMessage': {

          const partnerId = getPartnerId(senderId);

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

            const oldPartnerId = getPartnerId(senderId);

            if (oldPartnerId) {

                const oldPartnerWs = clients.get(oldPartnerId);

                if (oldPartnerWs?.readyState === WebSocket.OPEN) {

                    oldPartnerWs.send(JSON.stringify({ type: 'partnerDisconnected' }));

                }

            }

            for (const [roomId, users] of rooms.entries()) {

                if (users.includes(senderId)) { rooms.delete(roomId); break; }

            }

            const mode = senderWs.mode || 'safe';

            senderWs.send(JSON.stringify({ type: 'requeued' }));

            const queue = mode === 'safe' ? safeQueue : nsfwQueue;

            if(!queue.includes(senderId)) queue.push(senderId);

            checkForMatch(mode);

            break;

        }

        case 'reportUser': {

            const reporterId = senderId;

            const reportedPartnerId = getPartnerId(reporterId);

            if (reportedPartnerId) {

                const reportedWs = clients.get(reportedPartnerId);

                if (reportedWs) {

                    console.log(`🚨 USER REPORT: ${reporterId} reported ${reportedPartnerId}`);

                    const banDuration = 60 * 60 * 1000; // 1 hour

                    bannedIPs.set(reportedWs.ip, { unbanTime: Date.now() + banDuration, reason: "Reported by partner." });

                    reportedWs.close(1008, "You have been reported and disconnected.");

                }

                senderWs.send(JSON.stringify({ type: 'reportConfirmed' }));

                for (const [roomId, users] of rooms.entries()) {

                    if (users.includes(reporterId)) { rooms.delete(roomId); break; }

                }

            }

            break;

        }

      }

    } catch (error) {

      console.error('Failed to process message:', error);

    }

  });



  ws.on('close', () => {

    const clientId = (ws as ExtendedWebSocket).id;

    console.log(`❌ Client disconnected: ${clientId}`);

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

  });

});

// --- Start Server ---
server.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
