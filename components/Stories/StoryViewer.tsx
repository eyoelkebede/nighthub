"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Heart, Send } from "lucide-react";
import { useState, useEffect } from "react";

export interface Story {
  id: string;
  mediaUrl: string;
  type: 'image' | 'video';
  duration: number; // seconds
  timestamp: string;
}

export interface StoryUser {
  id: string;
  username: string;
  avatar: string;
  stories: Story[];
}

interface StoryViewerProps {
  user: StoryUser;
  onClose: () => void;
  onNextUser?: () => void;
  onPrevUser?: () => void;
}

export default function StoryViewer({ user, onClose, onNextUser, onPrevUser }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const currentStory = user.stories[currentIndex];

  useEffect(() => {
    setProgress(0);
  }, [currentIndex, user]);

  useEffect(() => {
    if (isPaused) return;

    const interval = 100; // Update every 100ms
    const step = 100 / ((currentStory.duration * 1000) / interval);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [currentIndex, isPaused, currentStory]);

  const handleNext = () => {
    if (currentIndex < user.stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onNextUser ? onNextUser() : onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      onPrevUser ? onPrevUser() : onClose();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
    >
      {/* Progress Bars */}
      <div className="absolute top-4 left-4 right-4 z-20 flex gap-1">
        {user.stories.map((story, idx) => (
          <div key={story.id} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-white"
              initial={{ width: idx < currentIndex ? "100%" : "0%" }}
              animate={{ width: idx === currentIndex ? `${progress}%` : idx < currentIndex ? "100%" : "0%" }}
              transition={{ duration: 0.1, ease: "linear" }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-8 left-4 right-4 z-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={user.avatar} alt={user.username} className="w-8 h-8 rounded-full border border-white/20" />
          <div>
            <span className="text-white font-bold text-sm block shadow-black drop-shadow-md">{user.username}</span>
            <span className="text-white/70 text-xs shadow-black drop-shadow-md">{currentStory.timestamp}</span>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <X className="text-white w-6 h-6" />
        </button>
      </div>

      {/* Content */}
      <div 
        className="relative w-full h-full"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {currentStory.type === 'image' ? (
          <img 
            src={currentStory.mediaUrl} 
            alt="Story" 
            className="w-full h-full object-cover"
          />
        ) : (
          <video 
            src={currentStory.mediaUrl}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        )}

        {/* Tap Areas */}
        <div className="absolute inset-0 flex">
          <div className="w-1/3 h-full" onClick={handlePrev} />
          <div className="w-2/3 h-full" onClick={handleNext} />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="absolute bottom-8 left-4 right-4 z-20 flex items-center gap-4">
        <div className="flex-1 relative">
          <input 
            type="text" 
            placeholder="Send message..." 
            className="w-full bg-black/40 backdrop-blur-md border border-white/20 rounded-full py-3 pl-4 pr-10 text-white placeholder:text-white/50 focus:outline-none focus:border-white/50"
          />
        </div>
        <button className="p-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-colors">
          <Heart className="w-6 h-6 text-white" />
        </button>
        <button className="p-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-colors">
          <Send className="w-6 h-6 text-white" />
        </button>
      </div>
    </motion.div>
  );
}
