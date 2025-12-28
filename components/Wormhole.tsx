"use client";

import React, { useEffect, useRef, useState } from "react";
import SimplePeer from "simple-peer";
import { motion, AnimatePresence } from "framer-motion";
import { RevenueDistributor } from "@/lib/RevenueLogic";
import { Loader2, Zap, Mic, MicOff, Video as VideoIcon, PhoneOff, Send, MessageCircle, X, ArrowUp, SkipForward, RefreshCw, Camera, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

// --- Report Modal ---
const ReportModal = ({ onSubmit, onCancel }: { onSubmit: (reason: string) => void, onCancel: () => void }) => {
  const [reason, setReason] = useState("");
  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-red-500/30 rounded-3xl p-6 shadow-[0_0_50px_rgba(220,38,38,0.2)]">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Flag className="text-red-500" /> Report User
        </h2>
        <p className="text-gray-400 text-sm mb-4">
          Please select a reason for reporting this user. This will be reviewed by our safety team.
        </p>
        <div className="space-y-2 mb-6">
          {['Inappropriate Content', 'Harassment', 'Underage', 'Spam/Bot', 'Other'].map((r) => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className={cn(
                "w-full p-3 rounded-xl text-left text-sm transition-colors",
                reason === r ? "bg-red-500/20 border border-red-500 text-white" : "bg-zinc-800 text-gray-400 hover:bg-zinc-700"
              )}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => onSubmit(reason)}
            disabled={!reason}
            className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Age Verification Modal ---
const AgeVerificationModal = ({ onVerify, onCancel }: { onVerify: () => void, onCancel: () => void }) => (
  <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
    <div className="w-full max-w-md bg-zinc-900 border border-red-500/30 rounded-3xl p-8 text-center shadow-[0_0_50px_rgba(220,38,38,0.2)]">
      <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <span className="text-2xl">🔞</span>
      </div>
      <h2 className="text-2xl font-bold text-white mb-4">Age Verification Required</h2>
      <p className="text-gray-400 mb-8 leading-relaxed">
        The Wormhole feature involves random video chat with strangers. 
        You must be 18 years or older to use this feature.
      </p>
      <div className="flex gap-4">
        <button 
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors"
        >
          Exit
        </button>
        <button 
          onClick={onVerify}
          className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 transition-colors shadow-lg shadow-red-600/20"
        >
          I am 18+
        </button>
      </div>
    </div>
  </div>
);

// --- Ad Component ---
const AdSlot = ({ onComplete }: { onComplete: () => void }) => {
  const [timeLeft, setTimeLeft] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl"
    >
      <div className="w-full max-w-md p-6 bg-zinc-900 border border-white/10 rounded-3xl text-center shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-4">Sponsored Content</h3>
        <div className="aspect-video bg-gray-800 rounded-2xl mb-4 flex items-center justify-center overflow-hidden relative border border-white/5">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-blue-500/20 animate-pulse" />
          <span className="relative z-10 font-mono text-sm text-white/80">Playing Ad...</span>
        </div>
        <div className="flex justify-between items-center text-sm text-gray-400">
          <span>Reward splitting in progress...</span>
          <span className="font-mono text-white">{timeLeft}s</span>
        </div>
      </div>
    </motion.div>
  );
};

// --- Chat Component ---
interface ChatMessage {
  id: string;
  text: string;
  isMe: boolean;
  timestamp: number;
}

const ChatOverlay = ({ 
  messages, 
  onSend, 
  isOpen, 
  onClose 
}: { 
  messages: ChatMessage[], 
  onSend: (text: string) => void, 
  isOpen: boolean, 
  onClose: () => void 
}) => {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    onSend(input);
    setInput("");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="absolute bottom-24 right-4 w-80 h-96 bg-transparent backdrop-blur-sm border border-white/10 rounded-3xl flex flex-col overflow-hidden shadow-2xl z-40"
        >
          {/* Header */}
          <div className="p-4 border-b border-white/5 flex justify-between items-center bg-black/20">
            <span className="font-medium text-white text-sm">iMessage</span>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
              <X size={16} className="text-gray-400" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-black/10" ref={scrollRef}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "max-w-[80%] p-3 text-sm rounded-2xl break-words",
                  msg.isMe
                    ? "bg-blue-500 text-white ml-auto rounded-br-sm"
                    : "bg-zinc-800/80 text-gray-200 mr-auto rounded-bl-sm"
                )}
              >
                {msg.text}
              </div>
            ))}
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-3 bg-black/20 border-t border-white/5">
            <div className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="iMessage"
                className="w-full bg-black/30 border border-white/10 rounded-full pl-4 pr-10 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors"
              />
              <button 
                type="submit"
                disabled={!input.trim()}
                className="absolute right-1 p-1.5 bg-blue-500 rounded-full text-white disabled:opacity-50 disabled:bg-gray-600 transition-all"
              >
                <ArrowUp size={14} strokeWidth={3} />
              </button>
            </div>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
};



// --- Main Wormhole Component ---
export default function Wormhole() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isFinding, setIsFinding] = useState(false);
  const [isPlayingAd, setIsPlayingAd] = useState(false);
  const [partnerStream, setPartnerStream] = useState<MediaStream | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected'>('idle');
  const connectionStatusRef = useRef<'idle' | 'connecting' | 'connected'>('idle');
  
  // Keep ref in sync with state
  useEffect(() => {
    connectionStatusRef.current = connectionStatus;
  }, [connectionStatus]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAgeVerified, setIsAgeVerified] = useState(false);
  const [showAgeModal, setShowAgeModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  
  const myVideo = useRef<HTMLVideoElement>(null);
  const partnerVideo = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<SimplePeer.Instance | null>(null);
  const revenueDistributor = useRef(new RevenueDistributor());
  
  // Signaling
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const myId = useRef(Math.random().toString(36).substring(7));

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((currentStream) => {
      setStream(currentStream);
    });

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      peerRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    if (myVideo.current && stream) {
      myVideo.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (partnerVideo.current && partnerStream) {
      partnerVideo.current.srcObject = partnerStream;
    }
  }, [partnerStream]);

  const handleStartClick = () => {
    if (!isAgeVerified) {
      setShowAgeModal(true);
    } else {
      startWormhole();
    }
  };

  const handleAgeVerify = () => {
    setIsAgeVerified(true);
    setShowAgeModal(false);
    startWormhole();
  };

  const startWormhole = () => {
    setIsFinding(true);
    setIsPlayingAd(true);
    setConnectionStatus('connecting');
    
    // Initialize Signaling Channel
    const channel = supabase.channel('wormhole_global');
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'signal' }, async ({ payload }) => {
        // payload: { type: 'signal' | 'join', data?: any, senderId: string, targetId?: string }
        
        // Ignore my own messages
        if (payload.senderId === myId.current) return;

        // If message is targeted, ignore if not for me
        if (payload.targetId && payload.targetId !== myId.current) return;

        if (payload.type === 'join') {
          // Someone joined and is looking for a peer.
          
          // Check if we are currently looking for a partner
          if (connectionStatusRef.current === 'connecting' && !peerRef.current) {
             // To avoid collision if both join simultaneously, add a small random delay
             // and check if we are still unconnected before initiating.
             const delay = Math.random() * 1000;
             setTimeout(() => {
               if (connectionStatusRef.current === 'connecting' && !peerRef.current) {
                 console.log("Initiating connection to", payload.senderId);
                 initializePeer(true, payload.senderId);
               }
             }, delay);
          }
        } else if (payload.type === 'signal') {
          // Received a signal (offer/answer/candidate)
          if (!peerRef.current) {
             // If I receive an offer and I don't have a peer, I accept it
             console.log("Received offer from", payload.senderId);
             initializePeer(false, payload.senderId);
          }
          peerRef.current?.signal(payload.data);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Announce presence
          console.log("Joined wormhole, announcing presence...");
          channel.send({
            type: 'broadcast',
            event: 'signal',
            payload: { type: 'join', senderId: myId.current }
          });
        }
      });
  };

  const initializePeer = (initiator: boolean, targetPeerId: string) => {
    if (!stream) return;

    const peer = new SimplePeer({
      initiator,
      trickle: false,
      stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    peer.on('signal', (data) => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'signal',
        payload: { 
          type: 'signal', 
          data, 
          senderId: myId.current, 
          targetId: targetPeerId 
        }
      });
    });

    peer.on('stream', (remoteStream) => {
      setPartnerStream(remoteStream);
      if (partnerVideo.current) {
        partnerVideo.current.srcObject = remoteStream;
      }
      setConnectionStatus('connected');
      setIsFinding(false);
    });

    peer.on('data', (data) => {
      const msg = JSON.parse(data.toString());
      setMessages(prev => [...prev, { ...msg, isMe: false }]);
      if (!isChatOpen) setIsChatOpen(true);
    });

    peer.on('error', (err) => {
      console.error("Peer error:", err);
      endCall();
    });

    peerRef.current = peer;
  };
  
  // Removed the useEffect for 'connecting' state as it's handled in the channel subscription now

  const handleAdComplete = async () => {
    setIsPlayingAd(false);
    try {
      await revenueDistributor.current.distributeAdRevenue();
    } catch (e) {
      console.error("Revenue distribution failed", e);
    }
  };

  const sendMessage = (text: string) => {
    if (!peerRef.current) return;
    const msg = { id: Date.now().toString(), text, timestamp: Date.now() };
    peerRef.current.send(JSON.stringify(msg));
    setMessages(prev => [...prev, { ...msg, isMe: true }]);
  };

  const endCall = () => {
    peerRef.current?.destroy();
    peerRef.current = null;
    setPartnerStream(null);
    setConnectionStatus('idle');
    setMessages([]);
    setIsFinding(false);
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    // Re-acquire stream if lost (optional, but good practice)
    if (!stream) {
       navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: true }).then(setStream);
    }
  };

  const handleNext = () => {
    // End current call but immediately start searching again
    peerRef.current?.destroy();
    peerRef.current = null;
    setPartnerStream(null);
    setMessages([]);
    setConnectionStatus('idle');
    
    // Small delay to ensure cleanup before restarting
    setTimeout(() => {
      startWormhole();
    }, 500);
  };

  const handleReport = async (reason: string) => {
    setShowReportModal(false);
    // In a real app, we would send the partner's ID and the reason to the backend.
    // Since we don't have the partner's ID easily accessible in this simplified peer setup (it's anonymous),
    // we'll just log it and simulate a success.
    console.log(`Reported user for: ${reason}`);
    
    // Try to insert into a 'reports' table if it exists
    try {
      await supabase.from('reports').insert({
        reason,
        timestamp: new Date().toISOString(),
        reporter_id: (await supabase.auth.getUser()).data.user?.id
      });
    } catch (e) {
      console.warn("Report logging failed (table might not exist)", e);
    }

    alert("User reported. We will review the interaction.");
    handleNext(); // Skip to next user immediately
  };

  const toggleMute = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCamera = async () => {
    if (stream) {
      const newMode = facingMode === 'user' ? 'environment' : 'user';
      setFacingMode(newMode);
      
      // Stop current video track
      stream.getVideoTracks().forEach(track => track.stop());
      
      // Get new stream
      const newStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: newMode },
        audio: true 
      });
      
      setStream(newStream);
      
      // Replace track in peer connection if active
      if (peerRef.current) {
        const oldTrack = stream.getVideoTracks()[0];
        const newTrack = newStream.getVideoTracks()[0];
        peerRef.current.replaceTrack(oldTrack, newTrack, newStream);
      }
    }
  };

  return (
    <div className="relative w-full h-[85vh] flex flex-col items-center justify-center overflow-hidden rounded-[2.5rem] bg-black border border-white/10 shadow-2xl">
      
      {/* Age Verification Modal */}
      <AnimatePresence>
        {showAgeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100]"
          >
            <AgeVerificationModal 
              onVerify={handleAgeVerify} 
              onCancel={() => setShowAgeModal(false)} 
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Partner Video (Full Screen) */}
      <div className="absolute inset-0 z-0 bg-zinc-900">
        {partnerStream ? (
          <video
            playsInline
            ref={partnerVideo}
            autoPlay
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-white/5 animate-pulse" />
          </div>
        )}
      </div>

      {/* Self Video (PIP) */}
      <motion.div 
        drag
        dragConstraints={{ left: 0, right: 200, top: 0, bottom: 400 }}
        className="absolute top-6 right-6 z-30 w-32 h-48 bg-black rounded-2xl overflow-hidden border border-white/20 shadow-2xl cursor-grab active:cursor-grabbing"
      >
        {stream && (
          <video
            playsInline
            muted
            ref={myVideo}
            autoPlay
            className="w-full h-full object-cover"
          />
        )}
      </motion.div>

      {/* Controls Overlay */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4">
        {connectionStatus === 'connected' ? (
          <>
            {/* Mute Button */}
            <button 
              onClick={toggleMute}
              className={cn(
                "p-4 rounded-full backdrop-blur-md transition-colors text-white",
                isMuted ? "bg-red-500 hover:bg-red-600" : "bg-white/10 hover:bg-white/20"
              )}
            >
              {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>

            {/* Next Button */}
            <button 
              onClick={handleNext}
              className="p-4 rounded-full bg-blue-500 hover:bg-blue-600 transition-colors text-white shadow-lg shadow-blue-500/30"
            >
              <SkipForward size={24} fill="currentColor" />
            </button>

            {/* End Call Button */}
            <button 
              onClick={endCall}
              className="p-4 rounded-full bg-red-500 hover:bg-red-600 transition-colors text-white shadow-lg shadow-red-500/30"
            >
              <PhoneOff size={32} fill="currentColor" />
            </button>

            {/* Message Button */}
            <button 
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={cn(
                "p-4 rounded-full backdrop-blur-md transition-colors text-white",
                isChatOpen ? "bg-green-500 hover:bg-green-600" : "bg-white/10 hover:bg-white/20"
              )}
            >
              <MessageCircle size={24} />
            </button>

            {/* Report Button */}
            <button 
              onClick={() => setShowReportModal(true)}
              className="p-4 rounded-full bg-white/10 backdrop-blur-md hover:bg-red-500/20 hover:text-red-500 transition-colors text-white"
              title="Report User"
            >
              <Flag size={24} />
            </button>

            {/* Camera Flip Button (Mobile Only) */}
            <button 
              onClick={toggleCamera}
              className="p-4 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-colors text-white md:hidden"
            >
              <RefreshCw size={24} />
            </button>
          </>
        ) : !isFinding ? (
          <button
            onClick={handleStartClick}
            className="group relative px-8 py-4 bg-green-500 hover:bg-green-400 transition-all rounded-full shadow-lg shadow-green-500/30"
          >
            <div className="flex items-center gap-2 text-white font-bold tracking-wide">
              <Zap className="w-5 h-5 fill-current" />
              Start Wormhole
            </div>
          </button>
        ) : (
          <div className="px-6 py-3 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white/70 font-mono text-sm flex items-center gap-3">
            <Loader2 className="animate-spin w-4 h-4" />
            Searching for partner...
          </div>
        )}
      </div>

      {/* Chat Overlay */}
      <ChatOverlay 
        messages={messages} 
        onSend={sendMessage} 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
      />

      {/* Report Modal */}
      <AnimatePresence>
        {showReportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100]"
          >
            <ReportModal 
              onSubmit={handleReport} 
              onCancel={() => setShowReportModal(false)} 
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ad Injection */}
      <AnimatePresence>
        {isPlayingAd && <AdSlot onComplete={handleAdComplete} />}
      </AnimatePresence>
    </div>
  );
}
