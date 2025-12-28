"use client";

import { useState } from "react";
import { useAppStore } from "@/store/useStore";
import { Image, Video, Send, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function CreatePost() {
  const { user, addPost } = useAppStore();
  const [content, setContent] = useState("");
  const [mediaType, setMediaType] = useState<'text' | 'video-short' | 'video-long'>('text');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = () => {
    if (!content.trim()) return;

    const newPost = {
      id: Date.now().toString(),
      author: {
        name: user.username,
        handle: user.username.toLowerCase().replace(/\s+/g, '_'),
        avatar: user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`,
        isVerified: false,
      },
      content,
      type: mediaType,
      // Ensure mediaUrl is null for text posts
      mediaUrl: mediaType === 'text' ? undefined : "https://images.unsplash.com/photo-1611974765270-ca1258634369?q=80&w=1000&auto=format&fit=crop", // Placeholder for now
      thumbnailUrl: mediaType === 'text' ? undefined : "https://images.unsplash.com/photo-1611974765270-ca1258634369?q=80&w=1000&auto=format&fit=crop",
      stats: { likes: 0, comments: 0, shares: 0, tips: 0 },
      timestamp: "Just now",
    };

    addPost(newPost);
    setContent("");
    setMediaType('text');
    setIsExpanded(false);
  };

  return (
    <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-4 mb-6">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-purple to-neon-blue shrink-0 overflow-hidden">
           {user.avatarUrl && <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />}
        </div>
        <div className="flex-1">
          <textarea
            placeholder="What's happening in the shadows?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setIsExpanded(true)}
            className="w-full bg-transparent text-white placeholder-gray-500 resize-none focus:outline-none min-h-[40px]"
            rows={isExpanded ? 3 : 1}
          />
          
          <AnimatePresence>
            {isExpanded && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-between mt-3 pt-3 border-t border-white/5"
              >
                <div className="flex gap-2">
                  <button 
                    onClick={() => setMediaType('text')}
                    className={`p-2 rounded-lg transition-colors ${mediaType === 'text' ? 'bg-white/10 text-neon-blue' : 'text-gray-400 hover:bg-white/5'}`}
                  >
                    <span className="text-xs font-medium">Text</span>
                  </button>
                  <button 
                    onClick={() => setMediaType('video-short')}
                    className={`p-2 rounded-lg transition-colors ${mediaType === 'video-short' ? 'bg-white/10 text-neon-blue' : 'text-gray-400 hover:bg-white/5'}`}
                  >
                    <Image size={18} />
                  </button>
                  <button 
                    onClick={() => setMediaType('video-long')}
                    className={`p-2 rounded-lg transition-colors ${mediaType === 'video-long' ? 'bg-white/10 text-neon-blue' : 'text-gray-400 hover:bg-white/5'}`}
                  >
                    <Video size={18} />
                  </button>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsExpanded(false)}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={18} />
                  </button>
                  <button 
                    onClick={handleSubmit}
                    disabled={!content.trim()}
                    className="bg-neon-blue text-black px-4 py-1.5 rounded-full font-medium text-sm hover:bg-neon-blue/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    Post <Send size={14} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
