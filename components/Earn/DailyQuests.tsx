"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { useAppStore } from "@/store/useStore";
import { useState } from "react";

const QUESTS = [
  { id: 1, task: "Watch 3 Ads", reward: 0.001, progress: 1, total: 3, type: 'ads' },
  { id: 2, task: "Like 10 Posts", reward: 0.0005, progress: 5, total: 10, type: 'engagement' },
  { id: 3, task: "Share a Story", reward: 0.002, progress: 0, total: 1, type: 'content' },
];

export default function DailyQuests() {
  const { addEarnings } = useAppStore();
  const [quests, setQuests] = useState(QUESTS);

  const handleClaim = (id: number, reward: number) => {
    addEarnings(reward, 'gaming'); // Categorize as gaming/quest rewards
    setQuests(prev => prev.filter(q => q.id !== id));
  };

  return (
    <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6">
      <h3 className="text-white font-bold text-lg mb-4">Daily Quests</h3>
      
      <div className="space-y-4">
        {quests.map((quest) => (
          <div key={quest.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <svg className="w-10 h-10 transform -rotate-90">
                  <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-gray-700" />
                  <circle 
                    cx="20" cy="20" r="18" 
                    stroke="currentColor" strokeWidth="3" fill="transparent" 
                    strokeDasharray={113}
                    strokeDashoffset={113 - (113 * quest.progress) / quest.total}
                    className="text-neon-blue transition-all duration-500" 
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                  {quest.progress}/{quest.total}
                </div>
              </div>
              <div>
                <p className="text-sm text-white font-medium">{quest.task}</p>
                <p className="text-xs text-neon-green">+{quest.reward} ETH</p>
              </div>
            </div>

            <button 
              onClick={() => handleClaim(quest.id, quest.reward)}
              className="px-3 py-1.5 bg-white/10 hover:bg-neon-blue/20 hover:text-neon-blue text-xs text-white rounded-lg transition-colors"
            >
              Claim
            </button>
          </div>
        ))}
        
        {quests.length === 0 && (
          <div className="text-center py-4 text-gray-500 text-sm">
            All quests completed! Come back tomorrow.
          </div>
        )}
      </div>
    </div>
  );
}
