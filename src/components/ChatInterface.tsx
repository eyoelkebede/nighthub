import React, { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import socketService from '../services/socketService';
import webRTCService from '../services/webrtcService';

const ChatInterface = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [partnerId, setPartnerId] = useState<string | null>(null);

  // Refs for the video elements
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // --- Connect to services and set up listeners ---
    socketService.connect();
    
    // Set up stream update handlers
    webRTCService.onLocalStreamUpdate = (stream) => {
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    };
    webRTCService.onRemoteStreamUpdate = (stream) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
    };

    // --- Socket Event Handlers ---
    socketService.on('partner-found', async (data: { partnerId: string }) => {
      console.log('Partner found!', data.partnerId);
      setPartnerId(data.partnerId);
      webRTCService.initialize(data.partnerId);
      // The "offerer" starts the media stream and creates the offer
      await webRTCService.startLocalStream();
      await webRTCService.createOffer();
    });

    socketService.on('webrtc-offer', async (data: { sdp: RTCSessionDescriptionInit }) => {
      console.log('Received WebRTC offer.');
      // This user is the "answerer"
      // Initialize WebRTC service if it hasn't been (it should have on 'partner-found')
      if (!webRTCService.peerConnection) {
         // This is a fallback, partnerId should be set already
         // You might need to request it from the server again in a real app
      }
      await webRTCService.startLocalStream();
      await webRTCService.handleReceivedOffer(data.sdp);
    });

    socketService.on('webrtc-answer', async (data: { sdp: RTCSessionDescriptionInit }) => {
      console.log('Received WebRTC answer.');
      await webRTCService.handleReceivedAnswer(data.sdp);
    });

    socketService.on('webrtc-ice-candidate', async (data: { candidate: RTCIceCandidateInit }) => {
      console.log('Received ICE candidate.');
      await webRTCService.handleNewICECandidate(data.candidate);
    });

    socketService.on('chat-message', (data) => {
      setMessages((prevMessages) => [...prevMessages, data]);
    });

    // --- Cleanup on component unmount ---
    return () => {
      webRTCService.closeConnection();
      socketService.disconnect();
    };
  }, []);

  const handleSendMessage = () => {
    if (message.trim()) {
      const messageData = { user: 'You', text: message };
      setMessages((prevMessages) => [...prevMessages, messageData]);
      socketService.emit('chat-message', messageData);
      setMessage('');
    }
  };

  return (
    <ChatContainer>
      <VideoArea>
        <VideoPlayer ref={remoteVideoRef} autoPlay playsInline>Remote Video</VideoPlayer>
        <VideoPlayer as="video" ref={localVideoRef} autoPlay playsInline muted>Local Video</VideoPlayer>
      </VideoArea>
      <ChatBox>
        {!partnerId && <StatusMessage>Waiting for a partner...</StatusMessage>}
        <MessageList>
          {messages.map((msg, index) => (
            <div key={index}>
              <strong>{msg.user}:</strong> {msg.text}
            </div>
          ))}
        </MessageList>
        <ChatInputContainer>
          <TextInput
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={!partnerId}
          />
          <SendButton onClick={handleSendMessage} disabled={!partnerId}>Send</SendButton>
        </ChatInputContainer>
      </ChatBox>
    </ChatContainer>
  );
};

// --- Styled Components ---
const ChatContainer = styled.div`...`; // Keep your existing styled components
const VideoArea = styled.div`...`;
const ChatBox = styled.div`...`;
const MessageList = styled.div`...`;
const ChatInputContainer = styled.div`...`;
const TextInput = styled.input`...`;
const SendButton = styled.button`...`;

// Update VideoPlaceholder to a real video element
const VideoPlayer = styled.video`
  width: 80%;
  height: 45%;
  background-color: #000;
  border: 1px solid #ccc;
  transform: scaleX(-1); // Mirror the video for a more natural feel
`;

const StatusMessage = styled.div`
  padding: 20px;
  text-align: center;
  font-style: italic;
  color: #888;
`;

export default ChatInterface;