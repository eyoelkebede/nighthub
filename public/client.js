const socket = io();

// Persistent User Identity
let myUserId = localStorage.getItem('nighthub_user_id');
if (!myUserId) {
    myUserId = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('nighthub_user_id', myUserId);
}

// DOM Elements
const landingScreen = document.getElementById('landing-screen');
const groupLobby = document.getElementById('group-lobby');
const chatScreen = document.getElementById('chat-screen');
const textBtn = document.getElementById('text-btn');
const groupBtn = document.getElementById('group-btn');
const backBtn = document.getElementById('back-btn');
const messagesDiv = document.getElementById('messages');
const msgInput = document.getElementById('msg-input');
const sendBtn = document.getElementById('send-btn');
const stopBtn = document.getElementById('stop-btn');
const newBtn = document.getElementById('new-btn');
const statusBar = document.getElementById('status-bar');
const chatHeaderInfo = document.getElementById('chat-header-info');
const chatForm = document.getElementById('chat-form');
const groupList = document.getElementById('group-list');
const createGroupBtn = document.getElementById('create-group-btn');
const createGroupModal = document.getElementById('create-group-modal');
const newGroupNameInput = document.getElementById('new-group-name');
const confirmCreateBtn = document.getElementById('confirm-create-btn');
const cancelCreateBtn = document.getElementById('cancel-create-btn');

// Call Controls
const callControls = document.getElementById('call-controls');
const videoCallBtn = document.getElementById('video-call-btn');
const audioCallBtn = document.getElementById('audio-call-btn');
const callOverlay = document.getElementById('call-overlay');
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
const incomingCallModal = document.getElementById('incoming-call-modal');
const acceptCallBtn = document.getElementById('accept-call-btn');
const declineCallBtn = document.getElementById('decline-call-btn');
const endCallBtn = document.getElementById('end-call-btn');

// Report Controls
const reportBtn = document.getElementById('report-btn');
const reportModal = document.getElementById('report-modal');
const cancelReportBtn = document.getElementById('cancel-report-btn');
const confirmReportBtn = document.getElementById('confirm-report-btn');
const reportReasonSelect = document.getElementById('report-reason');

// State
let currentMode = null; // 'random' or 'group'
let isConnected = false;
let currentGroup = null;
let peerConnection = null;
let localStream = null;
let activeCallType = null; // 'video' or 'audio'

// WebRTC Config
const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' } // Public STUN server
    ]
};

// Event Listeners
textBtn.addEventListener('click', () => startRandomChat());
groupBtn.addEventListener('click', () => showGroupLobby());
backBtn.addEventListener('click', () => showLanding());

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    sendMessage();
});

stopBtn.addEventListener('click', () => {
    if (currentMode === 'random') {
        disconnectChat(); // "Stop" becomes "Escape"
    } else {
        leaveGroup();
    }
});

newBtn.addEventListener('click', () => {
    if (currentMode === 'random') {
        messagesDiv.innerHTML = '';
        startRandomChat();
    } else {
        // In group mode, "New" might mean go back to lobby
        showGroupLobby();
    }
});

// Group Creation
createGroupBtn.addEventListener('click', () => {
    createGroupModal.classList.remove('hidden');
});

cancelCreateBtn.addEventListener('click', () => {
    createGroupModal.classList.add('hidden');
});

confirmCreateBtn.addEventListener('click', () => {
    const name = newGroupNameInput.value.trim();
    if (name) {
        socket.emit('create_group', name);
        newGroupNameInput.value = '';
        createGroupModal.classList.add('hidden');
    }
});

// Report Logic
reportBtn.addEventListener('click', () => {
    if (currentMode === 'random' && isConnected) {
        reportModal.classList.remove('hidden');
    }
});

cancelReportBtn.addEventListener('click', () => {
    reportModal.classList.add('hidden');
});

confirmReportBtn.addEventListener('click', () => {
    const reason = reportReasonSelect.value;
    socket.emit('report_user', { reason });
    reportModal.classList.add('hidden');
    alert('User reported. An admin will review the chat logs.');
});


// Call Events
videoCallBtn.addEventListener('click', () => initiateCall('video'));
audioCallBtn.addEventListener('click', () => initiateCall('audio'));
endCallBtn.addEventListener('click', endCall);

acceptCallBtn.addEventListener('click', async () => {
    incomingCallModal.classList.add('hidden');
    // Initialize connection and stream
    await startLocalStream(activeCallType === 'video'); // Get video if video call
    createPeerConnection();

    // Answer logic handled inside signal if we have offer, but wait, usually we get Offer -> Accept -> Answer
    // We haven't stored the offer yet. Let's fix that.
    if (window.pendingOffer) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(window.pendingOffer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('call_answer', { signal: answer });
        window.pendingOffer = null;
    }
});

declineCallBtn.addEventListener('click', () => {
    incomingCallModal.classList.add('hidden');
    callOverlay.classList.add('hidden');
    // socket.emit('call_declined'); // If needed
    stopLocalStream();
});


// Socket Events
socket.on('connect', () => {
    console.log('Connected to server');
});

// --- Random Chat Events ---
socket.on('waiting', () => {
    updateStatus('Looking for a stranger...');
    messagesDiv.innerHTML = ''; 
    addSystemMessage('Looking for someone you can chat with...');
});

socket.on('partner_found', ({ initiator }) => {
    updateStatus('Stranger');
    chatHeaderInfo.textContent = 'Stranger';
    addSystemMessage('iMessage with Stranger');
    isConnected = true;
    enableChat();
    stopBtn.textContent = 'Stop';
    stopBtn.classList.remove('hidden');
    newBtn.classList.add('hidden');
    
    // Show Call Buttons
    callControls.classList.remove('hidden');
});

socket.on('partner_disconnected', () => {
    updateStatus('Stranger disconnected');
    addSystemMessage('Stranger has disconnected. Finding someone new...');
    endCall(); // Ensure call ends too
    endChatState();

    // Auto-reconnect logic
    setTimeout(() => {
        if (currentMode === 'random' && !isConnected) {
             messagesDiv.innerHTML = '';
             startRandomChat();
        }
    }, 2000);
});

// --- Call Signaling Events ---
socket.on('incoming_call', ({ signal, type }) => {
    activeCallType = type;
    window.pendingOffer = signal;
    
    callOverlay.classList.remove('hidden');
    incomingCallModal.classList.remove('hidden');
    
    // Update UI for Audio/Video text
    const callText = incomingCallModal.querySelector('.call-type');
    callText.textContent = `FaceTime ${type === 'video' ? 'Video' : 'Audio'}...`;
});

socket.on('call_answered', async ({ signal }) => {
    if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
    }
});

socket.on('signal', async (data) => {
    if (!peerConnection) return;
    if (data.candidate) {
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) { console.error(e); }
    }
});

socket.on('call_ended', () => {
    endCallLocal();
});


// --- Group Chat Events ---
socket.on('groups_list', (groups) => {
    renderGroupList(groups);
});

socket.on('groups_update', (group) => {
    // Ideally we append or update, simpler to re-request list or append if simple
    // For now, let's just append if it's new
    addGroupItem(group); 
});

socket.on('group_created', (id) => {
    // Auto join the group you created? Or just list it?
    // Let's just refresh list
    socket.emit('list_groups');
});

socket.on('group_joined', (group) => {
    currentGroup = group;
    isConnected = true;
    
    groupLobby.classList.add('hidden');
    chatScreen.classList.remove('hidden');
    
    messagesDiv.innerHTML = '';
    chatHeaderInfo.textContent = group.name; // In iOS Group text is top center
    updateStatus(group.name);
    addSystemMessage(`Joined group: ${group.name}`);
    
    enableChat();
    stopBtn.textContent = 'Leave';
    stopBtn.classList.remove('hidden');
    newBtn.classList.add('hidden');
    
    // Hide call controls in group (for now)
    callControls.classList.add('hidden');
});

socket.on('group_count_update', ({ id, count }) => {
    // Update count in list if visible
    const el = document.getElementById(`count-${id}`);
    if (el) el.textContent = `${count} online`;
    // Update count in header if in group
    if (currentGroup && currentGroup.id === id) {
        updateStatus(`${currentGroup.name} (${count} online)`);
    }
});

// --- Common Events ---
socket.on('message', ({ sender, text, isGroup }) => {
    addMessage(sender, text, isGroup ? 'group' : 'random');
});


// Functions

function showLanding() {
    landingScreen.classList.remove('hidden');
    groupLobby.classList.add('hidden');
    chatScreen.classList.add('hidden');
}

function startRandomChat() {
    currentMode = 'random';
    landingScreen.classList.add('hidden');
    chatScreen.classList.remove('hidden');
    groupLobby.classList.add('hidden');
    
    chatHeaderInfo.textContent = 'Connecting...';
    socket.emit('search', { type: 'random', userId: myUserId });
    disableChat();
    stopBtn.textContent = 'Stop';
    stopBtn.disabled = false;
    newBtn.classList.add('hidden');
    callControls.classList.add('hidden'); // hidden until matched
}

function showGroupLobby() {
    currentMode = 'group';
    landingScreen.classList.add('hidden');
    chatScreen.classList.add('hidden');
    groupLobby.classList.remove('hidden');
    
    // Fetch groups
    socket.emit('list_groups');
}

function renderGroupList(groups) {
    groupList.innerHTML = '';
    groups.forEach(addGroupItem);
}

function addGroupItem(group) {
    const div = document.createElement('div');
    div.classList.add('group-item');
    div.innerHTML = `
        <div class="group-info">
            <span class="group-name">${group.name}</span>
            <span class="group-count" id="count-${group.id}">${group.count} online</span>
        </div>
        <button class="join-btn" onclick="joinGroup('${group.id}')">Join</button>
    `;
    // We need to attach event listener properly because onclick string needs global scope
    div.querySelector('.join-btn').addEventListener('click', () => {
        joinGroup(group.id);
    });
    
    groupList.appendChild(div);
}

function joinGroup(groupId) {
    const username = prompt("Enter a username (optional):") || "Anonymous";
    socket.emit('join_group', { groupId, username });
}

function leaveGroup() {
    socket.emit('leave');
    currentGroup = null;
    isConnected = false;
    showGroupLobby();
}

function disconnectChat() {
    socket.emit('leave');
    updateStatus('Disconnected');
    // addSystemMessage('You have disconnected.');
    endChatState();
    endCallLocal();
}

function endChatState() {
    isConnected = false;
    disableChat();
    stopBtn.classList.add('hidden');
    newBtn.classList.remove('hidden');
    callControls.classList.add('hidden');
    
    if (currentMode === 'group') {
        newBtn.textContent = 'Back to Groups';
        stopBtn.textContent = 'Leave';
    } else {
        newBtn.textContent = 'New Chat';
        stopBtn.textContent = 'Stop';
    }
}

function sendMessage() {
    const text = msgInput.value.trim();
    if (text && isConnected) {
        socket.emit('message', text);
        if (currentMode === 'random') {
            addMessage('You', text, 'me');
        } else {
            // Optimistic UI for group? 
            // Better to wait for server echo in group to ensure order or just append local
            // Let's rely on server echo for group to simplify "who said what"
             addMessage('You', text, 'me'); // Local echo
        }
        msgInput.value = '';
    }
}

function addMessage(sender, text, type) {
    const div = document.createElement('div');
    div.classList.add('message');
    
    if (sender === 'You') {
        div.classList.add('you');
        // iMessage tail logic could go here
    } else {
        div.classList.add('stranger');
    }

    // For groups, show sender name if not 'You' or 'Stranger'
    let content = '';
    if (currentMode === 'group' && sender !== 'You') {
        content += `<div class="sender-name">${sender}</div>`;
    }
    content += `<div class="msg-text">${text}</div>`;
    
    // Delivered text for 'You' (Simulated)
    if (sender === 'You') {
        content += `<div class="delivery-status">Delivered</div>`;
    }
    
    div.innerHTML = content;
    messagesDiv.appendChild(div);
    scrollToBottom();
}

function addSystemMessage(text) {
    const div = document.createElement('div');
    div.classList.add('system-message');
    div.textContent = text;
    messagesDiv.appendChild(div);
    scrollToBottom();
}

function scrollToBottom() {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function updateStatus(text) {
    statusBar.textContent = text;
    // Also update header if needed
    if (currentMode === 'random' && isConnected) {
         chatHeaderInfo.textContent = 'Stranger';
    }
}

function enableChat() {
    msgInput.disabled = false;
    sendBtn.disabled = false;
    msgInput.focus();
}

function disableChat() {
    msgInput.disabled = true;
    sendBtn.disabled = true;
}

// --- Call Logic ---

async function initiateCall(type) {
    activeCallType = type;
    callOverlay.classList.remove('hidden');
    // Show local video immediately if video
    await startLocalStream(type === 'video');
    
    createPeerConnection();
    
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    
    socket.emit('call_request', { signal: offer, type });
}

function createPeerConnection() {
    peerConnection = new RTCPeerConnection(rtcConfig);

    if (localStream) {
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
    }

    peerConnection.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
             socket.emit('signal', { candidate: event.candidate });
        }
    };
}

async function startLocalStream(videoEnabled) {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ 
            video: videoEnabled, 
            audio: true 
        });
        localVideo.srcObject = localStream;
        // If audio only, we might want to hide the local video element or show avatar
        if (!videoEnabled) {
            localVideo.style.opacity = '0';
        } else {
            localVideo.style.opacity = '1';
        }
    } catch (err) {
        console.error("Error accessing media devices.", err);
        alert("Could not access camera/microphone.");
        endCallLocal();
    }
}

function stopLocalStream() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    localVideo.srcObject = null;
}

function endCall() {
    socket.emit('end_call');
    endCallLocal();
}

function endCallLocal() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    stopLocalStream();
    remoteVideo.srcObject = null;
    callOverlay.classList.add('hidden');
    incomingCallModal.classList.add('hidden');
    window.pendingOffer = null;
}

