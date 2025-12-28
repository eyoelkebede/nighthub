"use client";

import Post from "./Post";
import CreatePost from "./CreatePost";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/useStore";
import { useEffect } from "react";

export default function Feed() {
  const { posts, injectAiPost } = useAppStore();

  // Initialize feed with AI posts if empty
  useEffect(() => {
    if (posts.length === 0) {
      // Inject initial batch
      for (let i = 0; i < 5; i++) {
        injectAiPost();
      }
    }

    // Set up interval to inject new posts periodically
    const interval = setInterval(() => {
      // 30% chance to post every 10 seconds to make it feel organic but not spammy
      if (Math.random() > 0.7) {
        injectAiPost();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [posts.length, injectAiPost]);

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 pb-20">
      <CreatePost />
      
      {posts.map((post) => (
        <Post key={post.id} post={post} />
      ))}
      
      {/* Loading Indicator */}
      <div className="flex justify-center py-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-6 h-6 border-2 border-neon-blue border-t-transparent rounded-full"
        />
      </div>
    </div>
  );
}
