"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Lock, AlertTriangle, Check } from "lucide-react";

interface TermsModalProps {
  isOpen: boolean;
  onAgree: () => void;
}

export default function TermsModal({ isOpen, onAgree }: TermsModalProps) {
  const [canAgree, setCanAgree] = useState(false);

  // Force user to read for a few seconds or scroll (simulated by timer)
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setCanAgree(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-4 text-neon-blue">
                <Shield size={32} />
                <h2 className="text-2xl font-bold text-white">Welcome to NightHub</h2>
              </div>

              <div className="space-y-4 text-gray-300 text-sm leading-relaxed h-64 overflow-y-auto pr-2 custom-scrollbar">
                <p>
                  <strong className="text-white">1. Data Privacy & Security</strong><br />
                  NightHub is a decentralized-first platform. We do not sell your personal data. 
                  Your credentials (passwords/keys) are hashed and never stored in plain text.
                </p>
                <p>
                  <strong className="text-white">2. Self-Custody</strong><br />
                  You are responsible for your account security. If you choose the 12-word passphrase method, 
                  <span className="text-red-400"> we cannot recover your account if you lose it.</span>
                </p>
                <p>
                  <strong className="text-white">3. Content Disclaimer</strong><br />
                  We are not responsible for user-generated content. By entering, you agree to follow our community guidelines.
                </p>
                <p>
                  <strong className="text-white">4. Age Restriction</strong><br />
                  You must be 18 years or older to use features like the Wormhole.
                </p>
              </div>

              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex gap-3 items-start">
                <AlertTriangle className="text-yellow-500 shrink-0 mt-0.5" size={18} />
                <p className="text-xs text-yellow-200/80">
                  By clicking "I Agree", you acknowledge that NightHub is not liable for any data loss resulting from lost credentials.
                </p>
              </div>

              <button
                onClick={onAgree}
                disabled={!canAgree}
                className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                  canAgree 
                    ? "bg-neon-blue text-black hover:bg-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.3)]" 
                    : "bg-zinc-800 text-gray-500 cursor-not-allowed"
                }`}
              >
                {canAgree ? (
                  <>
                    <Check size={20} />
                    I Agree & Continue
                  </>
                ) : (
                  "Please read above..."
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
