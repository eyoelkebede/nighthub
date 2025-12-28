"use client";

import ActivityHub from "@/components/Earn/ActivityHub";
import GameHub from "@/components/Earn/GameHub";
import DailyQuests from "@/components/Earn/DailyQuests";
import { useAppStore } from "@/store/useStore";
import { TrendingUp, Activity, DollarSign } from "lucide-react";

export default function ActivityPage() {
  const { finance } = useAppStore();

  return (
    <div className="min-h-screen pt-12 pb-32 px-6 flex flex-col items-center overflow-y-auto">
      <div className="w-full max-w-md space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Activity Hub</h1>
            <p className="text-gray-400 text-sm mt-1">Monetize your time via our partners.</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden border-2 border-white/10 flex items-center justify-center">
            <Activity className="text-neon-green w-6 h-6" />
          </div>
        </div>

        {/* Earnings Breakdown */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-900/50 border border-white/10 p-4 rounded-2xl">
            <div className="flex items-center gap-2 mb-2 text-gray-400 text-xs uppercase tracking-wider">
              <DollarSign size={14} />
              <span>Sponsor Pool</span>
            </div>
            <div className="text-xl font-bold text-white">${finance.earningsBreakdown?.ads.toFixed(2) || "0.00"}</div>
            <div className="text-[10px] text-gray-500 mt-1">Paid by Advertisers</div>
          </div>
          <div className="bg-zinc-900/50 border border-white/10 p-4 rounded-2xl">
            <div className="flex items-center gap-2 mb-2 text-gray-400 text-xs uppercase tracking-wider">
              <Activity size={14} />
              <span>Your Share</span>
            </div>
            <div className="text-xl font-bold text-white">
              ${((finance.earningsBreakdown?.walking || 0) + (finance.earningsBreakdown?.gaming || 0)).toFixed(2)}
            </div>
            <div className="text-[10px] text-gray-500 mt-1">80% Revenue Split</div>
          </div>
        </div>

        {/* Move-to-Earn Section */}
        <ActivityHub />

        {/* Play-to-Earn Section */}
        <GameHub />

        {/* Quests Section */}
        <DailyQuests />

      </div>
    </div>
  );
}
