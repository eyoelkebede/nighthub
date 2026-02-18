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
const groups = new Map(); // groupId -> { id, name, users: Set() }
const chatLogs = new Map(); // roomId -> [{ sender, text, timestamp }]
const channelViews = new Map(); // channelId -> count (Ranking System)
const broadcasts = new Map(); // socket.id -> { roomId, username, description, viewers: 0 }

// Create uploads directory on start
if (!fs.existsSync(path.join(__dirname, 'public/uploads'))) {
    fs.mkdirSync(path.join(__dirname, 'public/uploads'), { recursive: true });
}

// Initialize some default groups
const defaultGroups = ['General', 'Gaming', 'Music', 'Tech', 'Anime', 'Politics', 'LGBTQ+'];
defaultGroups.forEach(name => {
    const id = name.toLowerCase();
    groups.set(id, { id, name, users: new Set() });
});

io.on('connection', (socket) => {
    const clientIp = socket.handshake.address;
    console.log(`A user connected: ${socket.id} from ${clientIp}`);

    // --- Ranking & Broadcasts ---
    socket.on('channel_view', (channelId) => {
        const current = channelViews.get(channelId) || 0;
        channelViews.set(channelId, current + 1);
        // Optional: clean up old channels or persistence
    });
    
    socket.on('get_top_channels', () => {
        // Sort by views
        const sorted = [...channelViews.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([id, count]) => ({ id, count }));
        socket.emit('top_channels', sorted);
    });

    socket.on('start_broadcast', ({ description }) => {
        const userData = userMap.get(socket.id);
        if (!userData || !userData.room) return;
        
        // Mark as broadcast
        broadcasts.set(socket.id, {
            roomId: userData.room,
            username: userData.username || 'Anonymous',
            description: description || 'Live Chat',
            viewers: 0
        });
        
        io.emit('broadcast_added', {
             id: socket.id,
             username: userData.username,
             description: description
        });
    });
    
    socket.on('stop_broadcast', () => {
        if (broadcasts.has(socket.id)) {
            broadcasts.delete(socket.id);
            io.emit('broadcast_removed', socket.id);
        }
    });

    socket.on('list_broadcasts', () => {
        const list = Array.from(broadcasts.entries()).map(([id, data]) => ({
            id, 
            ...data
        }));
        socket.emit('broadcast_list', list);
    });

    socket.on('disconnect', () => {
        cleanupUser(socket);
        if (broadcasts.has(socket.id)) {
            broadcasts.delete(socket.id);
            io.emit('broadcast_removed', socket.id);
        }
    });

    // --- Search Logic ---
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

    // --- Group Chat Events ---
    socket.on('list_groups', () => {
        const groupList = Array.from(groups.values()).map(g => ({
            id: g.id,
            name: g.name,
            count: g.users.size
        }));
        socket.emit('groups_list', groupList);
    });

    socket.on('create_group', (groupName) => {
        if (!groupName || groupName.length > 20) return; // Simple validation
        
        const id = uuidv4(); 
        groups.set(id, { id, name: groupName, users: new Set() });
        
        socket.emit('group_created', id);
        io.emit('groups_update', { id, name: groupName, count: 0 }); 
    });

    socket.on('join_group', ({ groupId, username }) => {
        cleanupUser(socket); 
        
        // Auto-create group if it doesn't exist (supports dynamic channels)
        let group = groups.get(groupId);
        if (!group) {
            // For channels, we might want a friendly name. 
            // Since we don't send name from client, we'll use ID or a default.
            // Actually, for channels the name is displayed on client based on ID.
            // Server just needs to track users.
            group = { id: groupId, name: 'Channel ' + groupId, users: new Set() };
            groups.set(groupId, group);
        }

        if (group) {
            socket.join(groupId);
            group.users.add(socket.id);
            const user = username || 'Anonymous';
            userMap.set(socket.id, { room: groupId, type: 'group', username: user });

            socket.emit('group_joined', { id: group.id, name: group.name });
            
            socket.to(groupId).emit('message', {
                sender: 'System',
                text: `${user} has joined the chat.` // "System" message updated
            });

            // Update user counts globally (optional for channels)
            // io.emit('group_count_update', { id: groupId, count: group.users.size });
        }
    });

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
                 const logs = chatLogs.get(userData.room) || [];
                 logs.push({ sender: socket.id, media: relativePath, timestamp: new Date().toISOString() });
                 chatLogs.set(userData.room, logs);
                 
                 socket.to(userData.room).emit('message', msgData);
                 // Send back to sender so they see it
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
        } else if (userData.type === 'group' && userData.room) {
            const group = groups.get(userData.room);
            if (group) {
                group.users.delete(socket.id);
                socket.to(userData.room).emit('message', {
                    sender: 'System',
                    text: `${userData.username} left.`
                });
                io.emit('group_count_update', { id: userData.room, count: group.users.size });
                
                if (group.users.size === 0 && !defaultGroups.includes(group.name)) {
                   // Optional: clean up empty custom groups
                   groups.delete(group.id);
                   io.emit('group_removed', group.id);
                }
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
