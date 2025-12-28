"use client";

import FinanceCard from "@/components/Vault/FinanceCard";
import { useAppStore } from "@/store/useStore";
import { User, Shield, ChevronRight, RefreshCw, Edit3 } from "lucide-react";

export default function VaultPage() {
  const { user, updateUser } = useAppStore();

  return (
    <div className="min-h-screen pt-12 pb-32 px-6 flex flex-col items-center overflow-y-auto">
      <div className="w-full max-w-md space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white tracking-tight">The Vault</h1>
          <div className="relative group">
            <div className="w-12 h-12 rounded-full bg-gray-800 overflow-hidden border-2 border-white/10 cursor-pointer hover:border-neon-blue transition-colors">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-neon-purple to-neon-blue" />
              )}
            </div>
            <button 
              onClick={() => updateUser({ avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}` })}
              className="absolute -bottom-1 -right-1 p-1.5 bg-zinc-800 rounded-full border border-white/20 text-white hover:bg-neon-blue hover:text-black transition-colors"
              title="Randomize Avatar"
            >
              <RefreshCw size={12} />
            </button>
          </div>
        </div>

        {/* Finance Card */}
        <FinanceCard />

        {/* Profile Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider ml-1">Identity Settings</h2>
            <span className="text-[10px] text-gray-500">Auto-saves to cloud</span>
          </div>
          
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 overflow-hidden">
            <div className="p-4 flex items-center gap-4 border-b border-white/5">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <User className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 block mb-1">Username</label>
                <input 
                  type="text" 
                  value={user.username}
                  onChange={(e) => updateUser({ username: e.target.value })}
                  className="bg-transparent text-white font-medium focus:outline-none w-full placeholder-gray-600"
                  placeholder="Enter username"
                />
              </div>
              <Edit3 className="w-4 h-4 text-gray-600" />
            </div>

            <div className="p-4 flex items-center gap-4">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Shield className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 block mb-1">Bio</label>
                <input 
                  type="text" 
                  value={user.bio}
                  onChange={(e) => updateUser({ bio: e.target.value })}
                  className="bg-transparent text-white font-medium focus:outline-none w-full placeholder-gray-600"
                  placeholder="Tell us about yourself..."
                />
              </div>
              <Edit3 className="w-4 h-4 text-gray-600" />
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/10 flex gap-3">
          <Shield className="w-5 h-5 text-yellow-500 shrink-0" />
          <p className="text-xs text-yellow-200/80 leading-relaxed">
            Your keys, your crypto. NightHub does not store your private keys. 
            All vault data is encrypted locally on your device.
          </p>
        </div>

      </div>
    </div>
  );
}
