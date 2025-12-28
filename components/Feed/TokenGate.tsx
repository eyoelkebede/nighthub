"use client";

import { Lock, Unlock } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

interface TokenGateProps {
  price: string;
  onUnlock: () => void;
}

export default function TokenGate({ price, onUnlock }: TokenGateProps) {
  const [isUnlocking, setIsUnlocking] = useState(false);

  const handleUnlock = async () => {
    setIsUnlocking(true);
    // Simulate wallet signature/transaction
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsUnlocking(false);
    onUnlock();
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xl rounded-xl border border-white/10">
      <div className="p-6 text-center space-y-4 max-w-xs">
        <div className="w-12 h-12 mx-auto bg-white/10 rounded-full flex items-center justify-center mb-2">
          <Lock className="w-6 h-6 text-neon-purple" />
        </div>
        
        <h3 className="text-lg font-bold text-white">Premium Content</h3>
        <p className="text-sm text-gray-400">
          This content is encrypted on-chain. Unlock to view.
        </p>
        
        <button
          onClick={handleUnlock}
          disabled={isUnlocking}
          className="w-full py-3 px-4 bg-gradient-to-r from-neon-purple to-neon-blue rounded-xl font-bold text-white shadow-lg shadow-neon-purple/20 hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100"
        >
          {isUnlocking ? (
            <span className="animate-pulse">Verifying...</span>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <Unlock size={16} />
              <span>Unlock for {price} ETH</span>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
