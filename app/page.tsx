"use client";

import Feed from "@/components/Feed/Feed";
import { Search, Bell, Menu, User, Settings, HelpCircle, RefreshCw, Users, Edit3, LogOut } from "lucide-react";
import { useAppStore } from "@/store/useStore";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const { user, rebuildAlgorithm } = useAppStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showAlgorithmToast, setShowAlgorithmToast] = useState(false);

  const handleRebuildAlgorithm = () => {
    rebuildAlgorithm();
    setShowAlgorithmToast(true);
    setTimeout(() => setShowAlgorithmToast(false), 3000);
    setIsProfileOpen(false);
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Top Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-xl mx-auto px-4 h-16 flex items-center justify-between">
          
          {/* Profile Menu */}
          <div className="relative">
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center overflow-hidden border border-white/20"
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
              ) : (
                <span className="font-bold text-white text-xs">{user.username.substring(0, 2).toUpperCase()}</span>
              )}
            </button>

            <AnimatePresence>
              {isProfileOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsProfileOpen(false)} 
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-12 left-0 w-64 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="p-4 border-b border-white/5">
                      <div className="font-bold text-white">{user.username}</div>
                      <div className="text-xs text-gray-400 truncate">{user.bio}</div>
                      <div className="flex gap-4 mt-3 text-xs">
                        <div className="text-white">
                          <span className="font-bold">{user.followers}</span> <span className="text-gray-500">Followers</span>
                        </div>
                        <div className="text-white">
                          <span className="font-bold">{user.following}</span> <span className="text-gray-500">Following</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-2">
                      <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-lg transition-colors text-left">
                        <Edit3 size={16} /> Edit Profile
                      </button>
                      <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-lg transition-colors text-left">
                        <Users size={16} /> Friends & Followers
                      </button>
                      <button 
                        onClick={handleRebuildAlgorithm}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neon-blue hover:bg-neon-blue/10 rounded-lg transition-colors text-left"
                      >
                        <RefreshCw size={16} /> Rebuild Algorithm
                      </button>
                      <div className="h-px bg-white/5 my-1" />
                      <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-lg transition-colors text-left">
                        <Settings size={16} /> Settings
                      </button>
                      <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-lg transition-colors text-left">
                        <HelpCircle size={16} /> Help & Support
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          
          <div className="flex-1 mx-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-neon-blue transition-colors" />
              <input 
                type="text" 
                placeholder="Search NightHub..." 
                className="w-full bg-zinc-900/50 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-neon-blue/50 transition-all placeholder:text-gray-600"
              />
            </div>
          </div>

          <button className="relative p-2 text-gray-400 hover:text-white transition-colors">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-neon-purple rounded-full border border-black" />
          </button>
        </div>
      </div>

      {/* Main Feed Content */}
      <div className="pt-20 px-4">
        <Feed />
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {showAlgorithmToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-neon-blue text-black px-4 py-2 rounded-full font-medium text-sm shadow-lg z-50 flex items-center gap-2"
          >
            <RefreshCw size={16} className="animate-spin" />
            Feed Algorithm Rebuilt
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
