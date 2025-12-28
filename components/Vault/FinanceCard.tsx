"use client";

import { motion } from "framer-motion";
import { CreditCard, Wallet, ArrowUpRight, Settings, Lock } from "lucide-react";
import { useAppStore } from "@/store/useStore";
import { useState } from "react";

export default function FinanceCard() {
  const { finance, updateFinance } = useAppStore();
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="w-full max-w-md perspective-1000">
      <motion.div
        className="relative w-full aspect-[1.586] preserve-3d cursor-pointer"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        {/* Front of Card */}
        <div className="absolute inset-0 backface-hidden rounded-3xl overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900" />
          
          {/* Glass Effect Overlay */}
          <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" />
          
          {/* Content */}
          <div className="relative h-full p-6 flex flex-col justify-between z-10">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white/10 rounded-full backdrop-blur-md">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <span className="font-medium text-white/80 tracking-wide">NightVault</span>
              </div>
              <CreditCard className="w-8 h-8 text-white/50" />
            </div>

            <div className="space-y-1">
              <span className="text-sm text-gray-400 font-medium uppercase tracking-wider flex items-center gap-2">
                NightHub Credits <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-300">VIRTUAL</span>
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white tracking-tight">
                  {finance.totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-sm text-neon-blue font-bold">NHC</span>
              </div>
            </div>

            <div className="flex justify-between items-end">
              <button 
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold text-white transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={(e) => e.stopPropagation()}
                disabled
              >
                Withdraw <Lock size={12} />
              </button>
              <div className="text-xs text-gray-500 font-mono">
                **** **** **** {finance.walletAddress ? finance.walletAddress.slice(-4) : "0000"}
              </div>
            </div>
          </div>

          {/* Shine Effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 pointer-events-none" />
        </div>

        {/* Back of Card (Settings) */}
        <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-3xl overflow-hidden shadow-2xl bg-zinc-900 border border-white/10">
          <div className="h-full p-6 flex flex-col z-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Payout Settings</h3>
              <Settings className="w-5 h-5 text-gray-400" />
            </div>

            <div className="space-y-4 flex-1">
              <div className="space-y-2">
                <label className="text-xs text-gray-400 uppercase tracking-wider">Crypto Wallet (ETH)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={finance.walletAddress}
                    onChange={(e) => updateFinance({ walletAddress: e.target.value })}
                    placeholder="0x..."
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neon-blue/50 transition-colors font-mono"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-gray-400 uppercase tracking-wider">Banking (IBAN/Swift)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={finance.bankingInfo}
                    onChange={(e) => updateFinance({ bankingInfo: e.target.value })}
                    placeholder="Encrypted Storage"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neon-blue/50 transition-colors font-mono"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                </div>
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-white/5 flex justify-between items-center">
              <span className="text-xs text-gray-500">End-to-End Encrypted</span>
              <button 
                className="text-xs text-neon-blue hover:text-white transition-colors"
                onClick={(e) => { e.stopPropagation(); setIsFlipped(false); }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </motion.div>
      
      <div className="mt-8 grid grid-cols-2 gap-4">
        <button className="flex flex-col items-center justify-center p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-colors group">
          <div className="p-3 bg-neon-green/10 rounded-full mb-2 group-hover:scale-110 transition-transform">
            <ArrowUpRight className="w-6 h-6 text-neon-green" />
          </div>
          <span className="text-sm font-medium text-white">Withdraw</span>
        </button>
        <button className="flex flex-col items-center justify-center p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-colors group">
          <div className="p-3 bg-neon-blue/10 rounded-full mb-2 group-hover:scale-110 transition-transform">
            <CreditCard className="w-6 h-6 text-neon-blue" />
          </div>
          <span className="text-sm font-medium text-white">Add Method</span>
        </button>
      </div>
    </div>
  );
}
