"use client";

import { motion } from "framer-motion";
import { Footprints, Flame, Trophy, Briefcase } from "lucide-react";
import { useAppStore } from "@/store/useStore";
import { useEffect, useState } from "react";
import { RevenueDistributor } from "@/lib/RevenueLogic";

const SPONSORS = [
  { name: "Nike", pool: "5.0 ETH", rate: "0.0002 ETH/1k" },
  { name: "Adidas", pool: "3.2 ETH", rate: "0.00015 ETH/1k" },
  { name: "HealthHub", pool: "10.0 ETH", rate: "0.0003 ETH/1k" },
];

export default function StepTracker() {
  const { finance, updateSteps, addEarnings } = useAppStore();
  const [isWalking, setIsWalking] = useState(false);
  const [activeSponsor, setActiveSponsor] = useState(SPONSORS[0]);
  const distributor = new RevenueDistributor();

  // Simulate walking
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isWalking) {
      interval = setInterval(() => {
        const newSteps = finance.dailySteps + Math.floor(Math.random() * 8) + 2; // More realistic pace
        updateSteps(newSteps);
        
        // Every 100 steps, payout from Sponsor Pool
        if (newSteps % 100 === 0) {
          // Sponsor pays 100%, Platform takes 20% fee, User gets 80%
          const rawReward = 0.00002; // Base reward for 100 steps
          const platformFee = rawReward * 0.20;
          const userReward = rawReward - platformFee;
          
          addEarnings(userReward, 'walking');
          // In a real app, we would deduct rawReward from the Sponsor's pool
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isWalking, finance.dailySteps]);

  return (
    <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6 relative overflow-hidden">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-white font-bold text-lg">Sponsored Walk</h3>
          <p className="text-gray-400 text-xs">Get paid by brands to stay active.</p>
        </div>
        <div className="p-2 bg-neon-green/10 rounded-full">
          <Briefcase className="text-neon-green w-6 h-6" />
        </div>
      </div>

      {/* Sponsor Selection */}
      {!isWalking && (
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {SPONSORS.map((s) => (
            <button
              key={s.name}
              onClick={() => setActiveSponsor(s)}
              className={`flex-shrink-0 px-3 py-2 rounded-xl border text-xs transition-all ${
                activeSponsor.name === s.name 
                  ? "bg-neon-green/20 border-neon-green text-white" 
                  : "bg-zinc-800 border-white/5 text-gray-400 hover:bg-zinc-700"
              }`}
            >
              <div className="font-bold">{s.name}</div>
              <div className="opacity-70">{s.rate}</div>
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 mb-6">
        <span className="text-4xl font-bold text-white font-mono">{finance.dailySteps.toLocaleString()}</span>
        <span className="text-gray-500 text-sm mb-1">steps today</span>
      </div>

      {/* Progress Ring Visualization */}
      <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden mb-6">
        <motion.div 
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-neon-green to-emerald-500"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min((finance.dailySteps / 10000) * 100, 100)}%` }}
        />
      </div>

      <div className="flex gap-3">
        <button 
          onClick={() => setIsWalking(!isWalking)}
          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
            isWalking 
              ? "bg-red-500/20 text-red-500 border border-red-500/50" 
              : "bg-neon-green/20 text-neon-green border border-neon-green/50 hover:bg-neon-green/30"
          }`}
        >
          {isWalking ? "Stop Walking" : "Start Walking"}
        </button>
        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/5">
          <Flame className="text-orange-500 w-4 h-4" />
          <span className="text-white text-sm font-mono">
            {Math.floor(finance.dailySteps * 0.04)} kcal
          </span>
        </div>
      </div>
    </div>
  );
}
