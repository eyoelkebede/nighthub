"use client";

import { motion } from "framer-motion";
import { MapPin, Navigation } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface MapUser {
  id: string;
  username: string;
  avatar: string;
  lat: number; // Percentage 0-100
  lng: number; // Percentage 0-100
  status: string;
  lastActive: string;
}



export default function StoryMap() {
  const [users, setUsers] = useState<MapUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<MapUser | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, latitude, longitude, status, last_active')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (data && !error) {
        const mapUsers: MapUser[] = data.map((user: any) => ({
          id: user.id,
          username: user.username || 'Unknown',
          avatar: user.avatar_url || '',
          lat: user.latitude || 50,
          lng: user.longitude || 50,
          status: user.status || 'Active',
          lastActive: new Date(user.last_active).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
        setUsers(mapUsers);
      }
    };

    fetchUsers();
    
    const channel = supabase
      .channel('public:profiles')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
        setUsers(current => current.map(u => {
          if (u.id === payload.new.id) {
            return {
              ...u,
              lat: payload.new.latitude,
              lng: payload.new.longitude,
              status: payload.new.status,
              lastActive: new Date(payload.new.last_active).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
          }
          return u;
        }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="relative w-full h-[60vh] bg-[#0a0f1c] rounded-3xl overflow-hidden border border-white/10 shadow-2xl group">
      {/* Map Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0, 240, 255, 0.3)" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Radar Sweep Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,240,255,0.1),transparent_70%)] animate-pulse-slow pointer-events-none" />

      {/* User Pins */}
      {users.map((user) => (
        <motion.div
          key={user.id}
          className="absolute cursor-pointer"
          style={{ top: `${user.lat}%`, left: `${user.lng}%` }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.2, zIndex: 50 }}
          onClick={() => setSelectedUser(user)}
        >
          <div className="relative">
            {/* Pulse Ring */}
            <div className="absolute -inset-2 bg-neon-blue/30 rounded-full animate-ping" />
            
            {/* Avatar Pin */}
            <div className="relative w-10 h-10 rounded-full border-2 border-neon-blue bg-black overflow-hidden shadow-[0_0_15px_rgba(0,240,255,0.5)]">
              <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
            </div>

            {/* Status Tooltip */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {user.username}
            </div>
          </div>
        </motion.div>
      ))}

      {/* Selected User Card */}
      {selectedUser && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-xl border border-white/10 p-4 rounded-2xl flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <img src={selectedUser.avatar} alt={selectedUser.username} className="w-10 h-10 rounded-full" />
            <div>
              <h4 className="text-white font-bold text-sm">{selectedUser.username}</h4>
              <p className="text-neon-blue text-xs">{selectedUser.status} • {selectedUser.lastActive}</p>
            </div>
          </div>
          <button className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
            <Navigation className="w-5 h-5 text-white" />
          </button>
        </motion.div>
      )}

      {/* Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button className="p-2 bg-black/50 backdrop-blur-md rounded-lg border border-white/10 text-white hover:bg-white/10">
          <MapPin size={20} />
        </button>
      </div>
    </div>
  );
}
