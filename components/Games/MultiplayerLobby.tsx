"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Users, DollarSign, Shield, Loader2, Trophy } from "lucide-react";
import { useAppStore } from "@/store/useStore";

interface MultiplayerLobbyProps {
  gameId: string;
  gameName: string;
  GameComponent: React.ComponentType<{ onGameOver: (winner: 'p1' | 'p2') => void }>;
  onClose: () => void;
}

export default function MultiplayerLobby({ gameId, gameName, GameComponent, onClose }: MultiplayerLobbyProps) {
  const { finance, deductEarnings, addEarnings } = useAppStore();
  const [step, setStep] = useState<'wager' | 'searching' | 'playing' | 'result'>('wager');
  const [wager, setWager] = useState(0.01);
  const [opponent, setOpponent] = useState<{ name: string; avatar: string } | null>(null);
  const [winner, setWinner] = useState<'p1' | 'p2' | null>(null);

  const handleFindMatch = () => {
    if (finance.totalEarnings < wager) {
      alert("Insufficient funds!");
      return;
    }
    
    if (deductEarnings(wager)) {
      setStep('searching');
      
      // Simulate matchmaking
      setTimeout(() => {
        setOpponent({
          name: "Cyber_Ronin_99",
          avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60"
        });
        
        setTimeout(() => {
          setStep('playing');
        }, 1500);
      }, 2000);
    }
  };

  const handleGameOver = (result: 'p1' | 'p2') => {
    setWinner(result);
    setStep('result');

    if (result === 'p1') {
      // Calculate Winnings
      const totalPot = wager * 2;
      const fee = totalPot * 0.015; // 1.5% Fee
      const payout = totalPot - fee;
      
      addEarnings(payout, 'gaming');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white z-10">✕</button>

        {step === 'wager' && (
          <div className="p-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-2">{gameName} Arena</h2>
            <p className="text-gray-400 mb-8">Place your bet. Winner takes all (minus 1.5% fee).</p>

            <div className="bg-black/50 p-6 rounded-2xl border border-white/5 inline-block mb-8">
              <div className="text-gray-500 text-xs uppercase tracking-wider mb-2">Wager Amount</div>
              <div className="flex items-center gap-4 justify-center">
                <button onClick={() => setWager(Math.max(0.001, wager - 0.001))} className="w-10 h-10 bg-zinc-800 rounded-full text-xl">-</button>
                <div className="text-4xl font-mono font-bold text-neon-green w-48">{wager.toFixed(3)} ETH</div>
                <button onClick={() => setWager(wager + 0.001)} className="w-10 h-10 bg-zinc-800 rounded-full text-xl">+</button>
              </div>
              <div className="mt-2 text-xs text-gray-500">Potential Win: {(wager * 2 * 0.985).toFixed(4)} ETH</div>
            </div>

            <button 
              onClick={handleFindMatch}
              className="w-full bg-neon-blue text-black font-bold py-4 rounded-xl text-lg hover:scale-[1.02] transition-transform shadow-[0_0_20px_rgba(0,255,255,0.3)]"
            >
              Find Opponent
            </button>
          </div>
        )}

        {step === 'searching' && (
          <div className="p-12 text-center">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                className="w-full h-full border-4 border-zinc-800 border-t-neon-blue rounded-full"
              />
              <Users className="absolute inset-0 m-auto text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Searching for Opponent...</h3>
            <p className="text-gray-400 text-sm">Matching you with a player near your skill level.</p>
            
            {opponent && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 bg-zinc-800 p-4 rounded-xl flex items-center gap-4 max-w-xs mx-auto border border-neon-green/50"
              >
                <img src={opponent.avatar} className="w-10 h-10 rounded-full" />
                <div className="text-left">
                  <div className="text-xs text-gray-400">Opponent Found</div>
                  <div className="font-bold text-white">{opponent.name}</div>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {step === 'playing' && (
          <div className="p-4">
             <GameComponent onGameOver={handleGameOver} />
          </div>
        )}

        {step === 'result' && (
          <div className="p-12 text-center">
            {winner === 'p1' ? (
              <div className="space-y-6">
                <Trophy className="w-24 h-24 text-yellow-500 mx-auto" />
                <h2 className="text-4xl font-bold text-white">VICTORY!</h2>
                <div className="bg-green-500/20 border border-green-500/50 p-6 rounded-2xl">
                  <div className="text-gray-400 text-sm">You Won</div>
                  <div className="text-3xl font-mono font-bold text-green-400">+{(wager * 2 * 0.985).toFixed(4)} ETH</div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-4xl">💀</span>
                </div>
                <h2 className="text-4xl font-bold text-white">DEFEAT</h2>
                <p className="text-gray-400">Better luck next time.</p>
                <div className="text-red-500 font-mono">-{wager.toFixed(3)} ETH</div>
              </div>
            )}
            
            <button 
              onClick={() => setStep('wager')}
              className="mt-8 px-8 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200"
            >
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}