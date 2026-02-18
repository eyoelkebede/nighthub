// REPLACE 'https://your-app-name.onrender.com' with your actual Render URL after deployment
const socket = io('https://bntr.onrender.com', {
    transports: ['websocket', 'polling']
});

// Persistent User Identity
let myUserId = localStorage.getItem('nighthub_user_id');
if (!myUserId) {
    myUserId = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('nighthub_user_id', myUserId);
}

// --- DOM Elements ---
// Tabs
const tabs = {
    random: document.getElementById('tab-random'),
    watch: document.getElementById('tab-watch')
};
const tabBtns = document.querySelectorAll('.tab-btn');

// Random Chat Elements
const randomIntro = document.getElementById('random-intro');
const startRandomBtn = document.getElementById('start-random-btn');
const randomChatInterface = document.getElementById('random-chat-interface');
const randomHeaderInfo = document.getElementById('random-header-info');
const randomCallControls = document.getElementById('random-call-controls');
const randomMessages = document.getElementById('random-messages');
const randomChatForm = document.getElementById('random-chat-form');
const randomInput = document.getElementById('random-input');
const randomSendBtn = document.getElementById('random-send-btn');
const typingIndicator = document.getElementById('typing-indicator');

// New Next Button
const nextRandomBtnHeader = document.getElementById('next-random-btn-header');

const reportBtn = document.getElementById('report-btn');
const videoCallBtn = document.getElementById('video-call-btn');
const audioCallBtn = document.getElementById('audio-call-btn');

// Watch / Entertainment Elements
const watchLobby = document.getElementById('watch-lobby');
const channelList = document.getElementById('channel-list');
const watchInterface = document.getElementById('watch-interface');
const iptvPlayer = document.getElementById('iptv-player');
const backToChannelsBtn = document.getElementById('back-to-channels');
const toggleChatBtn = document.getElementById('toggle-chat-btn');
const closeChatBtn = document.getElementById('close-chat-btn');
const liveChatPanel = document.getElementById('live-chat-panel');
const channelNameDisplay = document.getElementById('channel-name-display');

// New Search & Category Elements
const channelSearch = document.getElementById('channel-search');
const searchToggleBtn = document.getElementById('search-toggle-btn');
const searchWrapper = document.getElementById('search-container-wrapper');
const categoryPills = document.querySelectorAll('.category-pill');
// globalViewerCount element removed from DOM, variable kept null safe 
const globalViewerCount = document.getElementById('global-viewer-count'); 

// Search Toggle Logic
if (searchToggleBtn && searchWrapper) {
    searchToggleBtn.addEventListener('click', () => {
        searchWrapper.classList.toggle('hidden');
        searchToggleBtn.classList.toggle('active');
        if (!searchWrapper.classList.contains('hidden') && channelSearch) {
            channelSearch.focus();
        }
    });
}

// Repurpose group elements for watch chat
const groupMessages = document.getElementById('group-messages');
const groupChatForm = document.getElementById('group-chat-form');
const groupInput = document.getElementById('group-input');
const groupSendBtn = document.getElementById('group-send-btn');

// Modals & Overlays
const reportModal = document.getElementById('report-modal');
const reportReasonSelect = document.getElementById('report-reason');
const confirmReportBtn = document.getElementById('confirm-report-btn');
const cancelReportBtn = document.getElementById('cancel-report-btn');

// --- Activity / Games Elements ---
const activityBtn = document.getElementById('activity-btn');
const activityMenu = document.getElementById('activity-menu');
const closeActivityMenu = document.getElementById('close-activity-menu');
const btnAskIcebreaker = document.getElementById('btn-ask-icebreaker');
const btnStartRPS = document.getElementById('btn-start-rps');

const callOverlay = document.getElementById('call-overlay');
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
const incomingCallModal = document.getElementById('incoming-call-modal');
const acceptCallBtn = document.getElementById('accept-call-btn');
const declineCallBtn = document.getElementById('decline-call-btn');
const endCallBtn = document.getElementById('end-call-btn');

// Extended Call Controls
const muteAudioBtn = document.getElementById('mute-audio-btn');
const muteVideoBtn = document.getElementById('mute-video-btn');
const callReportBtn = document.getElementById('call-report-btn');

// Media
const mediaBtn = document.getElementById('media-btn');
const mediaInput = document.getElementById('media-input');

const flipCameraBtn = document.getElementById('flip-camera-btn');
const callControls = document.getElementById('call-controls');
const callStatusEl = document.getElementById('call-status');
const callStatusText = document.getElementById('call-status-text');

// --- Facetime Logic ---
let currentFacingMode = 'user';
let controlsTimeout;

if (callOverlay) {
    // Toggle controls on tap
    callOverlay.addEventListener('click', (e) => {
        // Ignore clicks on buttons
        if (e.target.closest('button')) return;
        
        if (callControls) {
            callControls.classList.toggle('idle');
            // Reset auto-hide timer
            resetControlsTimer();
        }
    });
}

function resetControlsTimer() {
    clearTimeout(controlsTimeout);
    if (callControls && !callControls.classList.contains('idle')) {
        controlsTimeout = setTimeout(() => {
            callControls.classList.add('idle');
        }, 5000); // Hide after 5s inactivity
    }
}

if (flipCameraBtn) {
    flipCameraBtn.addEventListener('click', async () => {
        if (!localStream) return;
        
        // Toggle Mode
        currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
        
        // Stop current video track
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) videoTrack.stop();
        
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: currentFacingMode },
                audio: false // We keep the old audio track
            });
            
            const newVideoTrack = newStream.getVideoTracks()[0];
            
            // Replace track in local stream
            localStream.removeTrack(videoTrack);
            localStream.addTrack(newVideoTrack);
            localVideo.srcObject = localStream;
            
            // Replace track in PeerConnection sender
            if (peerConnection) {
                const sender = peerConnection.getSenders().find(s => s.track.kind === 'video');
                if (sender) sender.replaceTrack(newVideoTrack);
            }
        } catch (e) {
            console.error('Error flipping camera:', e);
            alert('Could not switch camera');
        }
    });
}

function updateCallStatus(text, show = true) {
    if (callStatusText) callStatusText.textContent = text;
    if (callStatusEl) {
        if (show) callStatusEl.style.display = 'flex';
        else callStatusEl.style.display = 'none';
    }
}
// Settings
const notifToggle = document.getElementById('notif-toggle');
const soundToggle = document.getElementById('sound-toggle');
const userIdDisplay = document.getElementById('user-id-display');
const clearDataBtn = document.getElementById('clear-data-btn');

// --- State ---
let currentTab = 'random';
let currentMode = 'random'; // 'random' or 'group'
let isConnected = false;
let currentGroupId = null;
let peerConnection = null;
let localStream = null;
let activeCallType = null;
let pendingOffer = null;

// WebRTC Config
const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

// --- Initialization ---
function init() {
    if (userIdDisplay) userIdDisplay.textContent = myUserId;
    
    // Default Tab
    switchTab('random');

    // Load Settings
    const savedSound = localStorage.getItem('nighthub_sound');
    if (savedSound !== null && soundToggle) soundToggle.checked = (savedSound === 'true');
    
    const savedNotif = localStorage.getItem('nighthub_notif');
    if (savedNotif !== null && notifToggle) notifToggle.checked = (savedNotif === 'true');
}



// --- Tab Logic ---
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        switchTab(tab);
    });
});

function switchTab(tabName) {
    currentTab = tabName;
    
    // Update UI
    tabBtns.forEach(btn => {
        if (btn.dataset.tab === tabName) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    Object.keys(tabs).forEach(key => {
        if (tabs[key]) {
            if (key === tabName) {
                tabs[key].classList.add('active');
                tabs[key].classList.remove('hidden');
            } else {
                tabs[key].classList.remove('active');
                tabs[key].classList.add('hidden');
            }
        }
    });

    // Logic per tab
    if (tabName === 'watch') {
        currentMode = 'group'; // Reuse group mode for socket logic
        if (entertainmentChannels.length === 0) {
             // Show loading immediately
             if (channelList) channelList.innerHTML = '<div style="text-align:center; padding:40px; color:#aaa; font-size: 1.2rem;">Loading Channels...</div>';
             fetchPlaylist(); // Then fetch
        }
        if (!currentGroupId) {
             // Show lobby
             if (watchLobby) watchLobby.classList.remove('hidden');
             if (watchInterface) watchInterface.classList.add('hidden');
        }
    } else if (tabName === 'random') {
        currentMode = 'random';
        // If connected, show chat, else show intro
    }
}

const stopRandomBtn = document.getElementById('stop-random-btn');
const interestInput = document.getElementById('interest-tags');

// --- Random Chat Logic ---
if (startRandomBtn) startRandomBtn.addEventListener('click', startRandomChat);
if (nextRandomBtnHeader) nextRandomBtnHeader.addEventListener('click', nextRandomChat);
if (stopRandomBtn) stopRandomBtn.addEventListener('click', stopConnecting);

function startRandomChat() {
    if (randomIntro) randomIntro.classList.add('hidden');
    if (randomChatInterface) randomChatInterface.classList.remove('hidden');
    if (randomMessages) randomMessages.innerHTML = '';
    
    // Get Interests
    const interests = interestInput ? interestInput.value : '';
    const tags = interests.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0);

    updateRandomStatus('Searching...');
    socket.emit('search', { type: 'random', userId: myUserId, interests: tags });
    
    setRandomChatState(false);
}

function stopConnecting() {
    // Leave socket room
    if (isConnected) {
        socket.emit('leave');
        endCall();
        isConnected = false;
    }
    // Return to intro
    if (randomChatInterface) randomChatInterface.classList.add('hidden');
    if (randomIntro) randomIntro.classList.remove('hidden');
}

function nextRandomChat() {
    if (isConnected) {
        socket.emit('leave');
        endCall();
        isConnected = false;
    }
    
    // Get Interests (reuse same as start)
    const interests = interestInput ? interestInput.value : '';
    const tags = interests.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0);
    
    if (randomMessages) randomMessages.innerHTML = '';
    updateRandomStatus('Searching...');
    socket.emit('search', { type: 'random', userId: myUserId, interests: tags });
    setRandomChatState(false);
}

function stopRandomChatUI() {
    isConnected = false;
    updateRandomStatus('Disconnected');
    setRandomChatState(false);
    if (randomCallControls) randomCallControls.classList.add('hidden');
}

function setRandomChatState(enabled) {
    if (randomInput) randomInput.disabled = !enabled;
    if (randomSendBtn) randomSendBtn.disabled = !enabled;
    if (enabled) {
        if (randomCallControls) randomCallControls.classList.remove('hidden');
    }
}

if (activityBtn) {
    activityBtn.addEventListener('click', () => {
        if (!isConnected) {
            alert('Find a partner first!');
            return;
        }
        activityMenu.classList.remove('hidden');
    });
}
if (closeActivityMenu) {
    closeActivityMenu.addEventListener('click', () => activityMenu.classList.add('hidden'));
}

// --- Icebreakers & Games Logic --- //
const ICEBREAKERS = [
    "If you could have dinner with any historical figure, who would it be?",
    "What’s the weirdest food you’ve ever eaten?",
    "If you could teleport anywhere right now, where would you go?",
    "What’s your favorite movie of all time?",
    "Do you believe in aliens?",
    "What’s a skill you’d love to learn instantly?",
    "Cats or Dogs?",
    "What was the last song you listened to?",
    "If you won the lottery today, what's the first thing you'd buy?",
    "Pineapple on pizza: Yes or No?"
];

// Icebreaker Click
if (btnAskIcebreaker) {
    btnAskIcebreaker.addEventListener('click', () => {
        activityMenu.classList.add('hidden');
        const question = ICEBREAKERS[Math.floor(Math.random() * ICEBREAKERS.length)];
        // Send as special system message
        socket.emit('message', {
             text: `🧊 Icebreaker: ${question}`,
             type: 'icebreaker'
        });
        
        // Show locally
        addActivityMessage(`🧊 Icebreaker: ${question}`, randomMessages);
    });
}

// RPS Click
if (btnStartRPS) {
    btnStartRPS.addEventListener('click', () => {
        activityMenu.classList.add('hidden');
        // Initiate Game
        socket.emit('game_invite', { game: 'rps' });
        addActivityMessage('🎮 You started a game of Rock Paper Scissors!', randomMessages);
        showRPSInterface(randomMessages, true); // true = isInitiator
    });
}

function addActivityMessage(htmlContent, container) {
    const div = document.createElement('div');
    // Using simple styling for now, or reuse system-message
    div.className = 'icebreaker-card'; 
    div.innerHTML = htmlContent;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

// RPS UI Builder
function showRPSInterface(container, isInit) {
    const gameId = 'rps-' + Date.now();
    activeRPSGame = gameId; // Track current game
    
    const div = document.createElement('div');
    div.className = 'game-rps-invite';
    div.id = gameId;
    
    div.innerHTML = `
        <div style="margin-bottom:10px; font-weight:bold; color:orange">Rock Paper Scissors</div>
        <div class="rps-choices">
            <button class="rps-btn" data-move="rock">🪨</button>
            <button class="rps-btn" data-move="paper">📄</button>
            <button class="rps-btn" data-move="scissors">✂️</button>
        </div>
        <div class="rps-result" id="res-${gameId}">Pick your move...</div>
    `;
    
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;

    // Attach events
    const buttons = div.querySelectorAll('.rps-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
             if (myMove) return; // Prevent double click

            // Disable all and highlight selection
            buttons.forEach(b => b.disabled = true);
            btn.classList.add('selected');
            
            const move = btn.dataset.move;
            myMove = move; // Store my move

            document.getElementById(`res-${gameId}`).innerText = "Waiting for opponent...";
            
            socket.emit('game_move', { game: 'rps', move: move });

            // Check if opponent already moved (if we are second)
            const resultDiv = document.getElementById(`res-${gameId}`);
            if (resultDiv && resultDiv.hasAttribute('data-opp-move')) {
                const oppMove = resultDiv.getAttribute('data-opp-move');
                setTimeout(() => resolveRPS(oppMove), 500);
            }
        });
    });
}


if (channelSearch) {
    channelSearch.addEventListener('input', (e) => {
        activeSearch = e.target.value;
        loadChannels();
    });
}

if (categoryPills) {
    categoryPills.forEach(pill => {
        pill.addEventListener('click', () => {
            // Update active state
            categoryPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            
            // Filter
            activeFilter = pill.dataset.filter === 'all' ? 'all' : pill.dataset.filter;
            loadChannels();
        });
    });
}

if (randomChatForm) {
    randomChatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = randomInput.value.trim();
        if (text && isConnected) {
            socket.emit('message', text);
            socket.emit('typing', false); // Stop typing immediately on send
            addMessage('You', text, 'me', randomMessages);
            randomInput.value = '';
        }
    });
}
// Typing Listener
if (randomInput) {
    let typingTimeout;
    randomInput.addEventListener('input', () => {
        if (!isConnected) return;
        socket.emit('typing', true);
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            socket.emit('typing', false);
        }, 3000);
    });
}

// --- Watch / Entertainment Logic ---
let entertainmentChannels = []; // Dynamic list

async function fetchPlaylist() {
    try {
        // Use the requested Amer M3U (Direct)
        const response = await fetch('https://iptv-org.github.io/iptv/countries/us.m3u'); 
        const text = await response.text();
        parseM3U(text);
    } catch (e) {
        console.error('Error fetching playlist:', e);
        // Fallback or retry with proxy
        try {
            // Using allorigins raw endpoint which handles CORS correctly
            const response = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent('https://iptv-org.github.io/iptv/countries/us.m3u'));
            if (!response.ok) throw new Error('Proxy error');
            const text = await response.text();
            parseM3U(text);
        } catch (err) {
            console.error('Fallback failed:', err);
            // Even if failed, call loadChannels to show empty state or error
            if (channelList) channelList.innerHTML = '<div style="text-align:center; padding:40px; color:#ff453a">Failed to load channels. Please refresh.</div>';
        }
    }
}

function parseM3U(data) {
    const lines = data.split('\n');
    entertainmentChannels = [];
    let currentChannel = {};

    for (let line of lines) {
        line = line.trim();
        if (line.startsWith('#EXTINF:')) {
            // Extract attributes
            const info = line.substring(8);
            const titleParts = info.split(',');
            currentChannel.name = titleParts[titleParts.length - 1].trim();
            
            // Extract logo
            const logoMatch = info.match(/tvg-logo="([^"]*)"/);
            if (logoMatch) currentChannel.logo = logoMatch[1];
            
            // Extract group/category
            const groupMatch = info.match(/group-title="([^"]*)"/);
            currentChannel.category = groupMatch ? groupMatch[1] : 'Uncategorized';
            
            // ID
            const idMatch = info.match(/tvg-id="([^"]*)"/);
            currentChannel.id = idMatch ? idMatch[1] : 'ch-' + Math.random().toString(36).substr(2, 9);
            
        } else if (line.startsWith('http')) {
            currentChannel.url = line;
            // Only add if we have a name and URL
            if (currentChannel.name && currentChannel.url) {
                entertainmentChannels.push({ ...currentChannel });
            }
            currentChannel = {}; // Reset
        }
    }
    
    // Sort or filter? Let's just load the first 50 for performance or specific categories
    // Actually, let's load all but render virtually or slice.
    // For now, slice top 100 relevant ones or just top 100
    loadChannels();
}

let activeFilter = 'all';
let activeSearch = '';
let currentGroupUsername = 'You';

function loadChannels() {
    // Top-Level Wrappers
    const newsList = document.getElementById('news-channels-list');
    const entertainmentList = document.getElementById('entertainment-channels-list');
    const sportsList = document.getElementById('sports-channels-list');
    const allList = document.getElementById('channel-list'); // Existing fallback
    const topList = document.getElementById('top-channels-list');
    
    // Clear all
    [newsList, entertainmentList, sportsList, allList, topList].forEach(el => {
        if (el) el.innerHTML = '';
    });
    
    // If no channels yet
    if (entertainmentChannels.length === 0) {
        if (allList) allList.innerHTML = '<div style="padding:20px; color:#666">Loading Channels...</div>';
        return;
    }

    // Helper to create card
    const createCard = (ch, isFeatured = false) => {
        const div = document.createElement('div');
        div.className = isFeatured ? 'netflix-card featured' : 'netflix-card';
        
        let imageContent;
        if (ch.logo) {
            imageContent = `<img src="${ch.logo}" alt="${ch.name}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
                            <div class="fallback-color" style="display:none; background: #333; width:100%; height:100%"></div>`;
        } else {
             const hue = (ch.name.length * 13) % 360; 
             imageContent = `<div class="fallback-color" style="background: hsl(${hue}, 60%, 25%); width:100%; height:100%"></div>`;
        }

        // Random match % for effect
        const match = Math.floor(80 + Math.random() * 19);

        div.innerHTML = `
            ${imageContent}
            <div class="card-content">
                <h4>${ch.name}</h4>
                <div class="meta">
                    <span class="match-score">${match}% Match</span>
                    <span>HD</span>
                    <span>${ch.category || 'TV'}</span>
                </div>
            </div>
        `;
        div.addEventListener('click', () => {
             // Ranking Event
             socket.emit('channel_view', ch.id);
             joinChannel(ch);
        });
        return div;
    };

    // Populate Top Channels (Mock: first 10 for now until server data flows back)
    entertainmentChannels.slice(0, 10).forEach(ch => {
        if (topList) topList.appendChild(createCard(ch, true));
    });

    // Populate Categories
    entertainmentChannels.forEach(ch => {
        const cat = (ch.category || '').toLowerCase();
        
        // News
        if (cat.includes('news') && newsList) {
            newsList.appendChild(createCard(ch));
        }
        // Entertainment / Movies
        else if ((cat.includes('movie') || cat.includes('entertainment')) && entertainmentList) {
            entertainmentList.appendChild(createCard(ch));
        }
        // Sports
        else if (cat.includes('sport') && sportsList) {
            sportsList.appendChild(createCard(ch));
        }
        // Default All List (Limit to 50 to avoid DOM overload)
        if (allList && allList.childElementCount < 50) {
            allList.appendChild(createCard(ch));
        }
    });
} // End loadChannels

// --- Broadcast Logic ---
const liveBroadcastsList = document.getElementById('live-broadcasts-list');
let isBroadcasting = false;

function refreshBroadcasts(list) {
    if (!liveBroadcastsList) return;
    liveBroadcastsList.innerHTML = '';
    
    if (list.length === 0) {
        liveBroadcastsList.innerHTML = '<div class="empty-state-card" style="padding: 20px; color #666;">No active user broadcasts.</div>';
        return;
    }
    
    list.forEach(item => {
        const card = document.createElement('div');
        card.className = 'netflix-card user-stream-card';
        card.innerHTML = `
            <div class="fallback-color" style="background: #222; width:100%; height:100%; display:flex; align-items:center; justify-content:center;">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="#ff453a"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
            </div>
            <div class="user-stream-badge">LIVE</div>
            <div class="card-content">
                <h4>${item.username || 'Anonymous'}</h4>
                <div class="meta">
                    <span style="color:white">${item.description}</span>
                </div>
            </div>
        `;
        card.addEventListener('click', () => {
             // For MVP: Join as a chat member first (video requires rewrite)
             joinBroadcast(item);
        });
        liveBroadcastsList.appendChild(card);
    });
}

function joinBroadcast(item) {
    // Treat as joining a group channel but show video placeholder
    joinChannel({
        id: item.roomId,
        name: item.username + "'s Stream",
        url: '', // No M3U URL
        isUserStream: true
    });
}

function toggleBroadcast() {
    if (!isConnected) return;
    if (isBroadcasting) {
        socket.emit('stop_broadcast');
        isBroadcasting = false;
        if (broadcastBtn) broadcastBtn.style.color = 'white';
    } else {
        const desc = prompt("Enter a description for your stream:", "Just chilling");
        if (desc) {
            socket.emit('start_broadcast', { description: desc });
            isBroadcasting = true;
            if (broadcastBtn) broadcastBtn.style.color = '#ff453a';
        }
    }
}

// Add Broadcast Listeners
socket.on('broadcast_list', (list) => refreshBroadcasts(list));
socket.on('broadcast_added', () => socket.emit('list_broadcasts')); // Refresh
socket.on('broadcast_removed', () => socket.emit('list_broadcasts'));

// Poll for broadcasts occasionally
setInterval(() => {
    if (socket.connected) socket.emit('list_broadcasts');
}, 10000);

// Initial Poll
setTimeout(() => { if (socket.connected) socket.emit('list_broadcasts'); }, 1000);

// --- Dictionary & Username Logic ---
const SAFE_WORDS = [
    "Apple", "Breeze", "Cloud", "Drift", "Eagle", "Forest", "Grove", "Harbor", "Island", "Jewel",
    "Kite", "Lunar", "Mist", "Nova", "Ocean", "Peak", "Quartz", "River", "Spark", "Tide",
    "Urban", "Vivid", "Wave", "Xenon", "Yacht", "Zenith", "Amber", "Bliss", "Cedar", "Dawn",
    "Echo", "Frost", "Glow", "Hazel", "Iris", "Jade", "Koala", "Leaf", "Moss", "Neon",
    "Opal", "Pine", "Quest", "Rain", "Snow", "Teal", "Unit", "Vibe", "Wind", "Zest"
];

function generateUsername() {
    const word = SAFE_WORDS[Math.floor(Math.random() * SAFE_WORDS.length)];
    const number = Math.floor(100 + Math.random() * 900); // 100-999
    return `${word}${number}`;
}

let hls = null;
let viewerCountInterval = null;

function joinChannel(channel) {
    if (watchLobby) watchLobby.classList.add('hidden');
    if (watchInterface) watchInterface.classList.remove('hidden');
    
    // Hide bottom nav for immersive mode
    const navContainer = document.querySelector('.floating-nav-container');
    if (navContainer) navContainer.style.display = 'none';

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'instant' });
    
    if (channelNameDisplay) channelNameDisplay.textContent = channel.name;

    // Handle User Streams vs IPTV
    if (channel.isUserStream) {
        // Stop any IPTV playback
        if (hls) { hls.destroy(); hls = null; }
        if (iptvPlayer) {
            iptvPlayer.pause();
            iptvPlayer.removeAttribute('src'); // Clear
            iptvPlayer.load();
            
            // Show placeholder or specialized UI
            iptvPlayer.poster = "https://media.giphy.com/media/l41lFw057lAJcYt0I/giphy.gif"; // Static until we implement WebRTC viewing
            // Notify user
            channelNameDisplay.innerHTML = `${channel.name} <span class="live-badge" style="background:#ff453a">USER LIVE</span>`;
            
            // In a real implementation, we would initiate WebRTC as a viewer here.
            // socket.emit('join_broadcast', channel.id);
            alert("This is a live user broadcast. Video functionality requires WebRTC rewrite. You are now in their chat!");
        }
    } else {
        // Play Regular IPTV
        playStream(channel.url);
    }
    
    // Join Chat Room
    const username = generateUsername(); 
    currentGroupUsername = username;
    
    currentGroupId = channel.id; // Treat channel ID as group ID
    socket.emit('join_group', { groupId: channel.id, username });
    
    // Reset Chat UI
    if (groupMessages) groupMessages.innerHTML = '';
    // Hide chat by default
    toggleChat(false);
    
    addSystemMessage(`Joined ${channel.name} chat as ${username}`, groupMessages);

    // Start Viewer Count Simulation
    startViewerCountSimulation();
}

function startViewerCountSimulation() {
    if (viewerCountInterval) clearInterval(viewerCountInterval);
    
    const updateCount = () => {
        if (!globalViewerCount) return;
        // fluctuation base
        let current = parseInt(globalViewerCount.textContent.replace(/,/g, '').replace('k', '000'));
        if (isNaN(current)) current = 2400;
        
        const change = Math.floor(Math.random() * 50) - 20; // -20 to +30
        let newValue = current + change;
        if (newValue < 100) newValue = 100;
        
        globalViewerCount.textContent = newValue > 999 ? (newValue/1000).toFixed(1) + 'k' : newValue;
    };
    
    updateCount(); // Initial
    viewerCountInterval = setInterval(updateCount, 3000);
}

function playStream(url) {
    if (Hls.isSupported() && url.endsWith('.m3u8')) {
        if (hls) hls.destroy();
        hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(iptvPlayer);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            iptvPlayer.play().catch(e => console.log('Autoplay blocked', e));
        });
    } else {
        // Native support or MP4
        iptvPlayer.src = url;
        iptvPlayer.play().catch(e => console.log('Autoplay blocked', e));
    }
}

if (backToChannelsBtn) {
    backToChannelsBtn.addEventListener('click', () => {
        // Leave functionality
        if (iptvPlayer) {
            iptvPlayer.pause();
            iptvPlayer.src = '';
            if (hls) {
                hls.destroy();
                hls = null;
            }
        }
        if (currentGroupId) {
            socket.emit('leave'); // Leaving the chat room
            currentGroupId = null;
        }

        if (viewerCountInterval) clearInterval(viewerCountInterval);
        
        // Show nav again
        const navContainer = document.querySelector('.floating-nav-container');
        if (navContainer) navContainer.style.display = 'flex';
        
        watchInterface.classList.add('hidden');
        watchLobby.classList.remove('hidden');
    });
}

// --- Group Chat Logic (Legacy + Watch) ---
// socket.on('groups_list', ...) -> Removed, we use static list
// window.joinGroup -> Removed, we use internal flow

socket.on('group_joined', (group) => {
    // Confirmation handled in joinChannel
});


if (groupChatForm) {
    groupChatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = groupInput.value.trim();
        if (text && currentGroupId) {
            socket.emit('message', text);
            addMessage(currentGroupUsername, text, 'me', groupMessages); // Local echo with Generated Name
            groupInput.value = '';
        }
    });
}



// --- Common Chat Functions ---
function addMessage(sender, text, type, container) {
    if (!container) return;
    const div = document.createElement('div');
    div.classList.add('message');
    if (sender === 'You') div.classList.add('you');
    else div.classList.add('stranger');

    // YouTube Live Chat Style for Group Messages
    if (container.id === 'group-messages') {
         // Format: [Username] [Message]
         const isMe = sender === currentGroupUsername || sender === 'You';
         const userClass = isMe ? 'yt-username me' : 'yt-username';
         const formattedText = text.replace(/(@\S+)/g, '<span class="mention">$1</span>');
         div.innerHTML = `<span class="${userClass}">${sender}:</span> <span class="yt-message-text">${formattedText}</span>`;
    } else {
        // Standard WhatsApp Style for Random Chat
        let content = '';
        if (sender !== 'You' && sender !== 'Stranger') {
            content += `<div class="sender-name">${sender}</div>`;
        }
        const formattedText = text.replace(/(@\S+)/g, '<span class="mention">$1</span>');
        content += `<div class="msg-text">${formattedText}</div>`;
        
        if (sender === 'You') {
            // WhatsApp style double tick
            const tickSVG = `<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M12.354 4.354a.5.5 0 0 0-.708-.708L5 10.293 1.854 7.146a.5.5 0 1 0-.708.708l3.5 3.5a.5.5 0 0 0 .708 0l7-7zm-4.208 7-.896-.897.707-.707.543.543 6.646-6.647a.5.5 0 0 1 .708.708l-7 7a.5.5 0 0 1-.708 0z"/><path d="m5.354 7.146.896.897-.707.707-.897-.896a.5.5 0 1 1 .708-.708z"/></svg>`;
            content += `<span class="delivery-status" title="Delivered">${tickSVG}</span>`;
        }
        div.innerHTML = content;
    }

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function addSystemMessage(text, container) {
    if (!container) container = (currentMode === 'random') ? randomMessages : groupMessages;
    if (!container) return;
    const div = document.createElement('div');
    div.classList.add('system-message');
    div.textContent = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function updateRandomStatus(text) {
    if (randomHeaderInfo) randomHeaderInfo.textContent = text;
}

// --- Game State ---
let activeRPSGame = null;
let myMove = null;

// --- Socket Events ---
socket.on('game_invite_received', ({ game }) => {
    if (game === 'rps') {
        addActivityMessage('🎮 Stranger started a game of Rock Paper Scissors!', randomMessages);
        showRPSInterface(randomMessages, false); // false = isResponder
    }
});

socket.on('game_opponent_move', ({ game, move }) => {
    if (game === 'rps' && activeRPSGame) {
        // Find existing game UI
        const resDiv = document.getElementById(`res-${activeRPSGame}`);
        if (!resDiv) return;

        if (myMove) {
            // Reveal immediately
            resolveRPS(move);
        } else {
            // Store for later
            resDiv.setAttribute('data-opp-move', move);
            resDiv.innerText = "Stranger made a move! Your turn.";
        }
    }
});

function resolveRPS(oppMove) {
     const resDiv = document.getElementById(`res-${activeRPSGame}`);
     if (!resDiv) return;
     
     let result = '';
     if (myMove === oppMove) result = "It's a Tie!";
     else if (
         (myMove === 'rock' && oppMove === 'scissors') ||
         (myMove === 'paper' && oppMove === 'rock') ||
         (myMove === 'scissors' && oppMove === 'paper')
     ) {
         result = "You Won! 🎉";
     } else {
         result = "You Lost! 💀";
     }
     
     resDiv.innerText = `${result} (Enemy chose ${getEmoji(oppMove)})`;
     
     // Clear state
     activeRPSGame = null;
     myMove = null;
}

function getEmoji(move) {
    if (move === 'rock') return '🪨';
    if (move === 'paper') return '📄';
    return '✂️';
}

socket.on('partner_found', ({ roomId, commonInterests }) => {
    isConnected = true;
    setRandomChatState(true);
    updateRandomStatus('Stranger');
    
    // Display common interests
    if (commonInterests && commonInterests.length > 0) {
        addSystemMessage(`Make a connection! You both like: ${commonInterests.join(', ')}`, randomMessages);
    } else {
        addSystemMessage('Connected with a stranger.', randomMessages);
    }
});

socket.on('message', (msg) => {
    const isGroup = msg.isGroup;
    const container = isGroup ? groupMessages : randomMessages;
    
    if (msg.media) {
        // Render media
        const div = document.createElement('div');
        div.classList.add('message');
        if (msg.sender === 'You') div.classList.add('you');
        else div.classList.add('stranger');
        
        let content = '';
        if (msg.media.type === 'image') {
            content = `<img src="${msg.media.url}" loading="lazy" alt="Image">`;
        } else {
            content = `<video src="${msg.media.url}" controls playsinline></video>`;
        }
        
        div.innerHTML = `
            <div class="msg-bubble media-msg">
                 ${content}
            </div>
            ${msg.sender !== 'You' && msg.sender !== 'Stranger' ? `<div class="sender-name">${msg.sender}</div>` : ''}
        `;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
        
        if (soundToggle && soundToggle.checked && msg.sender !== 'You') playMessageSound();
        return;
    }

    // Clear typing indicator on message receive
    const typInd = document.getElementById('typing-indicator-' + (isGroup ? 'group' : 'random'));
    if (typInd) typInd.remove();

    addMessage(msg.sender, msg.text, msg.sender === 'You' ? 'me' : 'them', container);
    if (soundToggle && soundToggle.checked && msg.sender !== 'You') playMessageSound();
});

// Typing Handler
socket.on('typing', ({ isTyping, user }) => {
    // Only for random chat for now as group chat has many users
    if (currentMode !== 'random') return; 
    
    const container = randomMessages;
    const id = 'typing-indicator-random';
    let typInd = document.getElementById(id);
    
    if (isTyping) {
        if (!typInd) {
            typInd = document.createElement('div');
            typInd.id = id;
            typInd.className = 'system-message typing-indicator';
            typInd.innerHTML = `<span>Stranger is typing...</span>`;
            container.appendChild(typInd);
            container.scrollTop = container.scrollHeight;
        }
    } else {
        if (typInd) typInd.remove();
    }
});

socket.on('error', (err) => {
    alert(err);
});

socket.on('disconnect', () => {
    isConnected = false;
    updateRandomStatus('Disconnected (Server Reset)');
    setRandomChatState(false);
});

socket.on('waiting', () => {
    updateRandomStatus('Searching...');
    addSystemMessage('Searching for a partner...', randomMessages);
});

socket.on('partner_disconnected', () => {
    isConnected = false;
    updateRandomStatus('Stranger Disconnected');
    addSystemMessage('Partner disconnected. Searching...', randomMessages);
    endCall();
    
    // Auto-search
    setTimeout(() => {
        if (currentMode === 'random' && !isConnected) {
            randomMessages.innerHTML = '';
            startRandomChat();
        }
    }, 2000);
});

// --- Reporting ---
if (reportBtn) reportBtn.addEventListener('click', () => reportModal.classList.remove('hidden'));
if (cancelReportBtn) cancelReportBtn.addEventListener('click', () => reportModal.classList.add('hidden'));
if (confirmReportBtn) {
    confirmReportBtn.addEventListener('click', () => {
        const reason = reportReasonSelect.value;
        socket.emit('report_user', { reason });
        reportModal.classList.add('hidden');
        alert('Report submitted.');
    });
}

// --- Settings ---
if (clearDataBtn) {
    clearDataBtn.addEventListener('click', () => {
        if(confirm('Clear all local data? ID will be reset on reload.')) {
            localStorage.clear();
            location.reload();
        }
    });
}
if (soundToggle) soundToggle.addEventListener('change', () => localStorage.setItem('nighthub_sound', soundToggle.checked));
if (notifToggle) notifToggle.addEventListener('change', () => localStorage.setItem('nighthub_notif', notifToggle.checked));


// --- WebRTC / Calls ---
if (videoCallBtn) videoCallBtn.addEventListener('click', () => initiateCall('video'));
if (audioCallBtn) audioCallBtn.addEventListener('click', () => initiateCall('audio'));
if (endCallBtn) endCallBtn.addEventListener('click', endCall);

const broadcastBtn = document.getElementById('broadcast-toggle-btn');
if (broadcastBtn) {
    broadcastBtn.addEventListener('click', () => {
        toggleBroadcast();
        // Visual Feedback
        if (isBroadcasting) {
            broadcastBtn.style.background = 'rgba(255, 69, 58, 0.2)';
            broadcastBtn.querySelector('span:last-child').textContent = 'Live';
        } else {
             broadcastBtn.style.background = '';
             broadcastBtn.querySelector('span:last-child').textContent = 'Go Live';
        }
    });
}
if (acceptCallBtn) acceptCallBtn.addEventListener('click', handleAcceptCall);
if (declineCallBtn) {
    declineCallBtn.addEventListener('click', () => {
        socket.emit('call_declined'); // Notify caller
        incomingCallModal.classList.add('hidden');
        callOverlay.classList.add('hidden');
        stopRing();
        stopLocalStream();
    });
}

// ... existing code ...

socket.on('call_declined', () => {
    // Show notification to the caller
    const statusEl = document.createElement('div');
    statusEl.className = 'call-status-toast';
    statusEl.textContent = 'Call Declined';
    document.body.appendChild(statusEl);

    // Fade out call overlay if active
    if (!callOverlay.classList.contains('hidden')) {
        // Optional: blur/dim video
        localVideo.style.opacity = '0.5';
    }
    
    setTimeout(() => {
        statusEl.remove();
        endCall(); // Close potential open call overlay
    }, 3000);
});


// New Overlay Controls
if (muteAudioBtn) muteAudioBtn.addEventListener('click', () => toggleTrack('audio'));
if (muteVideoBtn) muteVideoBtn.addEventListener('click', () => toggleTrack('video'));

function toggleTrack(kind) {
    if (localStream) {
        const track = kind === 'audio' ? localStream.getAudioTracks()[0] : localStream.getVideoTracks()[0];
        if (track) {
            track.enabled = !track.enabled;
            // Update UI
            const btn = kind === 'audio' ? muteAudioBtn : muteVideoBtn;
            if (!track.enabled) btn.classList.add('active-off'); 
            else btn.classList.remove('active-off');
        }
    }
}

if (callReportBtn) {
    callReportBtn.addEventListener('click', () => {
        if (reportModal) reportModal.classList.remove('hidden');
    });
}

if (mediaBtn) mediaBtn.addEventListener('click', () => mediaInput.click());
if (mediaInput) {
    mediaInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Size validation (e.g. 10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('File too large (Max 10MB)');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = () => {
            const buffer = reader.result; // ArrayBuffer
            const type = file.type.startsWith('image') ? 'image' : 'video';
            socket.emit('share_media', { buffer, type });
        };
        reader.readAsArrayBuffer(file);
    });
}

async function initiateCall(type) {
    if (!isConnected) return;
    activeCallType = type;
    
    try {
        await startLocalStream(type === 'video');
        createPeerConnection();
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('call_request', { signal: offer, type });
        
        callOverlay.classList.remove('hidden'); // Show overlay immediately for caller
        updateCallStatus('Calling...');
        resetControlsTimer();
    } catch (e) { console.error(e); }
}

async function handleAcceptCall() {
    incomingCallModal.classList.add('hidden');
    stopRing();
    
    await startLocalStream(activeCallType === 'video');
    createPeerConnection();
    callOverlay.classList.remove('hidden'); // Show call screen now
    updateCallStatus('Connecting...');
    resetControlsTimer();
    
    if (pendingOffer) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(pendingOffer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('call_answer', { signal: answer });
        pendingOffer = null;
    }
}

function createPeerConnection() {
    peerConnection = new RTCPeerConnection(rtcConfig);
    if (localStream) {
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    }
    peerConnection.ontrack = (e) => {
        remoteVideo.srcObject = e.streams[0];
        updateCallStatus('', false); // Hide status on track
        resetControlsTimer();
    };
    peerConnection.onicecandidate = (e) => {
        if (e.candidate) socket.emit('signal', { candidate: e.candidate });
    };
    peerConnection.onconnectionstatechange = () => {
        switch(peerConnection.connectionState) {
            case 'connected':
                updateCallStatus('', false);
                break;
            case 'disconnected':
            case 'failed':
                updateCallStatus('Reconnecting...');
                break;
            case 'closed':
                endCall();
                break;
        }
    };
}

async function startLocalStream(video) {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: video, audio: true });
        localVideo.srcObject = localStream;
        
        // Reset buttons
        if (muteAudioBtn) muteAudioBtn.classList.remove('active-off');
        if (muteVideoBtn) muteVideoBtn.classList.remove('active-off');

        if (!video) {
             localVideo.style.opacity = '0';
             if (muteVideoBtn) muteVideoBtn.classList.add('hidden');
        } else {
             localVideo.style.opacity = '1';
             if (muteVideoBtn) muteVideoBtn.classList.remove('hidden');
        }
    } catch (e) {
        console.error(e);
        alert('Camera/Mic access denied');
        throw e;
    }
}

function stopLocalStream() {
    if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
        localStream = null;
    }
    localVideo.srcObject = null;
}

function endCall() {
    socket.emit('end_call');
    stopLocalStream();
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    callOverlay.classList.add('hidden');
    stopRing();
}

socket.on('incoming_call', ({ signal, type }) => {
    activeCallType = type;
    pendingOffer = signal;
    
    // callOverlay.classList.remove('hidden'); // Don't show call screen yet
    incomingCallModal.classList.remove('hidden');
    
    const label = incomingCallModal.querySelector('.call-type');
    if (label) label.textContent = `Incoming ${type === 'video' ? 'Video' : 'Audio'} Call...`;
    
    if (!soundToggle || soundToggle.checked) playRing();
});

socket.on('call_answered', async ({ signal }) => {
    if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
    }
});

socket.on('signal', async (data) => {
    if (peerConnection && data.candidate) {
        try { await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch(e){}
    }
});

socket.on('call_ended', () => {
    endCall();
});

// --- Sounds ---
let ringInterval;
// AudioContext needs user interaction first, usually.
let audioCtx; 

function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playRing() {
    initAudio();
    stopRing();
    ringInterval = setInterval(() => {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.frequency.value = 800; // Hz
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 1);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 1);
    }, 2000);
}

function stopRing() {
    if (ringInterval) clearInterval(ringInterval);
    ringInterval = null;
}

function playMessageSound() {
    initAudio();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.frequency.value = 1200;
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.3);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
}

// Global click to resume AudioContext (common browser requirement)
document.body.addEventListener('click', () => {
    initAudio();
}, { once: true });



// Init
init();
