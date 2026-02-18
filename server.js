const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    maxHttpBufferSize: 50 * 1024 * 1024, // 50MB
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(express.static(path.join(__dirname, 'public')));

const fs = require('fs');

// State management
let textQueue = [];
const userMap = new Map(); // socket.id -> { room, type, partnerId, username, ip }
const chatLogs = new Map(); // roomId -> [{ sender, text, timestamp }]

// Create uploads directory on start
if (!fs.existsSync(path.join(__dirname, 'public/uploads'))) {
    fs.mkdirSync(path.join(__dirname, 'public/uploads'), { recursive: true });
}

io.on('connection', (socket) => {
    const clientIp = socket.handshake.address;
    console.log(`A user connected: ${socket.id} from ${clientIp}`);

    // --- Random Chat Logic ---
    socket.on('search', ({ type, userId, interests }) => {
        cleanupUser(socket);
        const userIdentifier = userId || socket.id;
        console.log(`User ${userIdentifier} looking for chat. Interests: ${interests}`);
        
        // Add minimal delay to avoid race conditions in rapid skipping
        setTimeout(() => {
             matchUser(socket, type, userIdentifier, interests); // Pass interests
        }, 500);
    });

    function matchUser(socket, type, userId, interests = []) {
        if (!socket.connected) return; // Verify socket is still open
        
        let targetQueue = textQueue;
        let partnerSocket = null;
        let commonInterests = [];

        // Try to find a match with common interests first
        if (targetQueue.length > 0) {
            // Find best match
            const matchIndex = targetQueue.findIndex(queuedUser => {
                // Ignore self
                if (queuedUser.socket.id === socket.id) return false;
                
                // Active check
                if (!io.sockets.sockets.get(queuedUser.socket.id)) return false;

                // Check intersection
                const intersection = queuedUser.interests.filter(tag => interests.includes(tag));
                if (intersection.length > 0) {
                    commonInterests = intersection;
                    return true;
                }
                return false;
            });

            if (matchIndex !== -1) {
                // Found interest match
                const match = targetQueue.splice(matchIndex, 1)[0];
                partnerSocket = match.socket;
            } else {
                // No interest match, just take the first valid one (Loose matching)
                const firstValidIndex = targetQueue.findIndex(queuedUser => 
                    queuedUser.socket.id !== socket.id && io.sockets.sockets.get(queuedUser.socket.id)
                );
                
                if (firstValidIndex !== -1) {
                    const match = targetQueue.splice(firstValidIndex, 1)[0];
                    partnerSocket = match.socket;
                }
            }
        }

        if (partnerSocket) {
             // Connect
            const roomId = uuidv4();
            socket.join(roomId);
            partnerSocket.join(roomId);
            
            // Notify both
            io.to(roomId).emit('partner_found', { 
                roomId, 
                commonInterests: commonInterests 
            });
            
            // Reconstruct minimal userMap for session
            userMap.set(socket.id, { room: roomId, type: 'random', partnerId: partnerSocket.id, username: 'Anonymous' });
            userMap.set(partnerSocket.id, { room: roomId, type: 'random', partnerId: socket.id, username: 'Anonymous' });

            // Initialize chat log for this room
            chatLogs.set(roomId, []);
        } else {
             // No match found, add to queue with interests
             // We use an object to store socket + metadata
             targetQueue.push({ socket: socket, interests: interests || [] });
        }
    }

    // --- Universal Messaging ---
    socket.on('message', (msg) => {
        const userData = userMap.get(socket.id);
        if (!userData || !userData.room) return;

        // Block Links
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        if (urlRegex.test(msg)) {
            socket.emit('error', 'Sharing links is forbidden.');
            return;
        }

        // Log message
        const timestamp = new Date().toISOString();
        if (userData.type === 'random') {
            const logs = chatLogs.get(userData.room) || [];
            logs.push({ sender: socket.id, text: msg, timestamp });
            chatLogs.set(userData.room, logs);
        }

        if (userData.type === 'random') {
            socket.to(userData.room).emit('message', {
                sender: 'Stranger',
                text: msg
            });
        } else if (userData.type === 'group') {
            socket.to(userData.room).emit('message', {
                sender: userData.username,
                text: msg,
                isGroup: true 
            });
        }
    });

    // --- Games Logic ---
    socket.on('game_invite', ({ game }) => {
        const userData = userMap.get(socket.id);
        if (!userData || !userData.room) return;
        
        socket.to(userData.room).emit('game_invite_received', { game });
    });

    socket.on('game_move', ({ game, move }) => {
        const userData = userMap.get(socket.id);
        if (!userData || !userData.room) return;
        
        // Simple trust-client relay for now
        socket.to(userData.room).emit('game_opponent_move', { game, move });
    });

    socket.on('share_media', ({ buffer, type }) => {
        const userData = userMap.get(socket.id);
        if (!userData || !userData.room) return;

        // Basic validation
        if (!['image', 'video'].includes(type)) return;
        
        // Save file
        const ext = type === 'image' ? 'jpg' : 'mp4';
        const filename = `${uuidv4()}.${ext}`;
        const relativePath = path.join('uploads', filename);
        const absPath = path.join(__dirname, 'public', relativePath);
        
        fs.writeFile(absPath, Buffer.from(buffer), (err) => {
             if (err) {
                 socket.emit('error', 'Upload failed');
                 return;
             }
             
             const msgData = {
                 sender: userData.type === 'random' ? 'Stranger' : userData.username,
                 media: { type, url: relativePath },
                 isGroup: userData.type === 'group'
             };
             
             if (userData.type === 'random') {
                 // Log it
                 socket.emit('message', { ...msgData, sender: 'You' });
             } else if (userData.type === 'group') {
                 socket.to(userData.room).emit('message', msgData);
                 socket.emit('message', { ...msgData, sender: 'You' });
             }
        });
    });

    // --- Reporting ---
    socket.on('report_user', ({ reason }) => {
        const userData = userMap.get(socket.id);
        if (!userData || !userData.partnerId) return; // Can only report active partner for now

        const partnerId = userData.partnerId;
        const partnerData = userMap.get(partnerId);
        const log = chatLogs.get(userData.room) || [];
        
        const report = {
            reporter: { id: socket.id, ip: userData.ip },
            reported: { id: partnerId, ip: partnerData ? partnerData.ip : 'unknown' },
            reason,
            timestamp: new Date().toISOString(),
            chatLog: log
        };

        // Save report to file
        const reportPath = path.join(__dirname, 'logs', 'reports.json');
        
        // Ensure logs directory exists
        const logDir = path.dirname(reportPath);
        if (!fs.existsSync(logDir)){
            fs.mkdirSync(logDir);
        }

        let reports = [];
        try {
            if (fs.existsSync(reportPath)) {
                const data = fs.readFileSync(reportPath, 'utf8');
                reports = JSON.parse(data);
            }
        } catch (err) {
            console.error('Error reading reports file:', err);
        }
        
        reports.push(report);
        
        fs.writeFile(reportPath, JSON.stringify(reports, null, 2), (err) => {
            if (err) console.error('Error saving report:', err);
            else console.log(`Report filed by ${socket.id} against ${partnerId}`);
        });

        socket.emit('report_received');
    });

    // --- WebRTC Signaling for Calls ---
    socket.on('call_request', ({ signal, type }) => {
        // type: 'audio' or 'video'
        const userData = userMap.get(socket.id);
        if (userData && userData.partnerId) {
            io.to(userData.partnerId).emit('incoming_call', { 
                signal, 
                from: socket.id,
                type
            });
        }
    });

    socket.on('call_answer', ({ signal }) => {
        const userData = userMap.get(socket.id);
        if (userData && userData.partnerId) {
            io.to(userData.partnerId).emit('call_answered', { signal });
        }
    });

    socket.on('call_declined', () => {
        const userData = userMap.get(socket.id);
        if (userData && userData.partnerId) {
            // Forward event to the caller
            io.to(userData.partnerId).emit('call_declined');
        }
    });
    
    // Generic signaling (ICE candidates, etc.)
    socket.on('signal', (data) => {
        const userData = userMap.get(socket.id);
        if (userData && userData.partnerId) {
            io.to(userData.partnerId).emit('signal', data);
        }
    });

    socket.on('end_call', () => {
        const userData = userMap.get(socket.id);
        if (userData && userData.partnerId) {
            io.to(userData.partnerId).emit('call_ended');
        }
    });

    socket.on('typing', (isTyping) => {
        const userData = userMap.get(socket.id);
        if (userData && userData.room) {
            socket.to(userData.room).emit('typing', { isTyping, user: userData.username });
        }
    });

    socket.on('leave', () => {
        handleDisconnect(socket);
    });

    socket.on('disconnect', () => {
        handleDisconnect(socket);
    });
});

// Legacy addToQueue (Might be unused now, but keeping safe).
// The main logic is now inside matchUser's fallback branch.
function addToQueue(socket, userId, interests = []) {
    textQueue.push({ socket, interests });
    socket.data.userId = userId;
    userMap.set(socket.id, { type: 'random', waiting: true, username: userId, interests, ip: socket.handshake.address });
    socket.emit('waiting');
}

function handleDisconnect(socket) {
    const userData = userMap.get(socket.id);
    console.log(`User disconnected: ${socket.id}`);
    
    if (userData && userData.room && userData.partnerId) {
        const partnerSocket = io.sockets.sockets.get(userData.partnerId);
        if (partnerSocket) {
             partnerSocket.emit('partner_disconnected');
             // Clean partner state? Or let them search again?
             // Usually on Omegle, you see "Stranger disconnected" and can click "New"
             // We don't need to force leave the room for partner immediately if we want to show message.
             // But for cleanup, we should arguably clear the map for minimal leaks.
             
             // Keep partner in room but nullify connection
             const pData = userMap.get(userData.partnerId);
             if (pData) pData.partnerId = null; 
        }
    }
    
    cleanupUser(socket);
}

function cleanupUser(socket) {
    // Remove from random queue (which now stores objects)
    textQueue = textQueue.filter(item => item.socket.id !== socket.id);

    const userData = userMap.get(socket.id);
    if (userData) {
        userMap.delete(socket.id);

        if (userData.type === 'random' && userData.room && userData.partnerId) {
            const partnerSocket = io.sockets.sockets.get(userData.partnerId);
            if (partnerSocket) {
                partnerSocket.leave(userData.room);
                partnerSocket.emit('partner_disconnected');
                userMap.set(partnerSocket.id, { ...userMap.get(partnerSocket.id), room: null, partnerId: null });
            }
        }

        if (userData.room) {
             socket.leave(userData.room);
        }
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`NIGHTHUB server running on port ${PORT}`);
});
