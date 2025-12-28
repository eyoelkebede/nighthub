"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import StoryMap from "@/components/Stories/StoryMap";
import StoryViewer, { StoryUser } from "@/components/Stories/StoryViewer";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function StoriesPage() {
  const [stories, setStories] = useState<StoryUser[]>([]);
  const [viewingUserIndex, setViewingUserIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchStories = async () => {
      const { data, error } = await supabase
        .from('stories')
        .select(`
          *,
          profiles (username, avatar_url)
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true });

      if (data && !error) {
        // Group stories by user
        const groupedStories: Record<string, StoryUser> = {};
        
        data.forEach((story: any) => {
          const userId = story.user_id;
          if (!groupedStories[userId]) {
            groupedStories[userId] = {
              id: userId,
              username: story.profiles?.username || 'Unknown',
              avatar: story.profiles?.avatar_url || '',
              stories: []
            };
          }
          groupedStories[userId].stories.push({
            id: story.id,
            type: story.type,
            mediaUrl: story.media_url,
            duration: story.duration,
            timestamp: new Date(story.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
        });

        setStories(Object.values(groupedStories));
      }
    };

    fetchStories();
  }, []);

  const handleNextUser = () => {
    if (viewingUserIndex !== null && viewingUserIndex < stories.length - 1) {
      setViewingUserIndex(viewingUserIndex + 1);
    } else {
      setViewingUserIndex(null);
    }
  };

  const handlePrevUser = () => {
    if (viewingUserIndex !== null && viewingUserIndex > 0) {
      setViewingUserIndex(viewingUserIndex - 1);
    } else {
      setViewingUserIndex(null);
    }
  };

  return (
    <div className="min-h-screen bg-black relative">
      {/* Map Background */}
      <div className="absolute inset-0 z-0">
        <StoryMap />
      </div>

      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white drop-shadow-lg">Stories Map</h1>
          <button className="w-10 h-10 rounded-full bg-neon-blue text-black flex items-center justify-center shadow-[0_0_15px_rgba(0,255,255,0.5)] hover:scale-110 transition-transform">
            <Plus size={24} />
          </button>
        </div>
      </div>

      {/* Stories Carousel */}
      <div className="absolute bottom-24 left-0 right-0 z-10 px-4 overflow-x-auto no-scrollbar">
        <div className="flex gap-4 pb-4">
          {stories.map((user, index) => (
            <motion.button
              key={user.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewingUserIndex(index)}
              className="flex flex-col items-center gap-2 min-w-[70px]"
            >
              <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-neon-blue to-neon-purple">
                <div className="w-full h-full rounded-full border-2 border-black overflow-hidden">
                  <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                </div>
              </div>
              <span className="text-xs font-medium text-white drop-shadow-md truncate w-full text-center">
                {user.username}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Full Screen Story Viewer */}
      <AnimatePresence>
        {viewingUserIndex !== null && stories[viewingUserIndex] && (
          <StoryViewer 
            user={stories[viewingUserIndex]} 
            onClose={() => setViewingUserIndex(null)}
            onNextUser={handleNextUser}
            onPrevUser={handlePrevUser}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
