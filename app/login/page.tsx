"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowRight, Copy, RefreshCw, ShieldCheck, Mail } from "lucide-react";
import { ethers } from "ethers";
import TermsModal from "@/components/Auth/TermsModal";

export default function AuthPage() {
  const [view, setView] = useState<'terms' | 'login' | 'signup'>('terms');
  const [loginMethod, setLoginMethod] = useState<'phrase' | 'otp'>('phrase');
  
  // Form States
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phrase, setPhrase] = useState(""); // For login
  const [generatedPhrase, setGeneratedPhrase] = useState(""); // For signup
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPhrase, setShowPhrase] = useState(false);
  const [hasAgreedToTerms, setHasAgreedToTerms] = useState(false);

  const router = useRouter();

  // Check local storage for terms agreement
  useEffect(() => {
    const agreed = localStorage.getItem("nighthub_terms_agreed");
    if (agreed) {
      setHasAgreedToTerms(true);
      setView('login');
    }
  }, []);

  const handleTermsAgree = () => {
    localStorage.setItem("nighthub_terms_agreed", "true");
    setHasAgreedToTerms(true);
    setView('login');
  };

  // --- Helper Functions ---

  const generatePhrase = () => {
    const wallet = ethers.Wallet.createRandom();
    if (wallet.mnemonic) {
      setGeneratedPhrase(wallet.mnemonic.phrase);
    }
  };

  const hashPhrase = async (text: string) => {
    const msgBuffer = new TextEncoder().encode(text.trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // --- Auth Handlers ---

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generatedPhrase) return;
    
    setLoading(true);
    setError(null);

    try {
      // 1. Check username uniqueness
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('username')
        .ilike('username', username)
        .single();

      if (existingUser) throw new Error("Username already taken");

      // 2. Hash the phrase to use as password
      const hashedPassword = await hashPhrase(generatedPhrase);

      // 3. Sign Up
      const { error } = await supabase.auth.signUp({
        email,
        password: hashedPassword,
        options: {
          data: {
            username,
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
          },
        },
      });

      if (error) throw error;
      alert("Account created! Please check your email to confirm.");
      setView('login');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (loginMethod === 'phrase') {
        // Login with 12-word phrase (hashed)
        const hashedPassword = await hashPhrase(phrase);
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: hashedPassword,
        });
        if (error) throw error;
        router.push("/");
      } else {
        // Login with OTP (2FA)
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        alert("Magic Link sent! Check your email.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Render ---

  if (!hasAgreedToTerms) {
    return <TermsModal isOpen={true} onAgree={handleTermsAgree} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(0,240,255,0.1),transparent_50%)] pointer-events-none" />

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(0,240,255,0.3)]">
            <span className="font-bold text-white text-xl">NH</span>
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">
            {view === 'login' ? "Access Vault" : "Create Identity"}
          </h2>
          <p className="mt-2 text-gray-400 text-sm">
            {view === 'login' 
              ? "Secure decentralized authentication." 
              : "Your keys, your data. No compromises."}
          </p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/80 p-8 rounded-3xl border border-white/10 backdrop-blur-xl shadow-2xl"
        >
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center flex items-center justify-center gap-2">
              <ShieldCheck size={16} />
              {error}
            </div>
          )}

          {view === 'signup' ? (
            <form onSubmit={handleSignUp} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 ml-1">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-blue transition-colors"
                  placeholder="NightOwl_01"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 ml-1">Email (for 2FA & Recovery)</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-blue transition-colors"
                  placeholder="you@example.com"
                />
                <p className="text-[10px] text-gray-500 mt-1 ml-1">
                  * We do not sell or share your email. Used only for authentication.
                </p>
              </div>

              {/* Seed Phrase Generation */}
              <div className="pt-2">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-medium text-neon-blue">Your Secret Key (Password)</label>
                  <button 
                    type="button"
                    onClick={generatePhrase}
                    className="text-[10px] flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
                  >
                    <RefreshCw size={10} /> Generate New
                  </button>
                </div>
                
                {generatedPhrase ? (
                  <div className="relative group">
                    <div className="p-4 bg-black/80 border border-neon-blue/30 rounded-xl text-sm text-gray-300 font-mono break-words leading-relaxed">
                      {generatedPhrase}
                    </div>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(generatedPhrase)}
                      className="absolute top-2 right-2 p-2 bg-zinc-800 rounded-lg text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={generatePhrase}
                    className="w-full py-8 border-2 border-dashed border-white/10 rounded-xl text-gray-500 hover:border-neon-blue/50 hover:text-neon-blue transition-colors flex flex-col items-center gap-2"
                  >
                    <ShieldCheck size={24} />
                    <span>Click to Generate Secure Phrase</span>
                  </button>
                )}
                <p className="text-[10px] text-red-400 mt-2 text-center">
                  ⚠️ Save these 12 words! We cannot recover your account without them.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !generatedPhrase}
                className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
              >
                {loading ? "Creating Identity..." : "Create Account"}
              </button>
            </form>
          ) : (
            // LOGIN VIEW
            <div className="space-y-6">
              {/* Login Method Tabs */}
              <div className="flex p-1 bg-black/50 rounded-xl border border-white/5">
                <button
                  onClick={() => setLoginMethod('phrase')}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                    loginMethod === 'phrase' ? 'bg-zinc-800 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  12-Word Phrase
                </button>
                <button
                  onClick={() => setLoginMethod('otp')}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                    loginMethod === 'otp' ? 'bg-zinc-800 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  2FA / Magic Link
                </button>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1 ml-1">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-blue transition-colors"
                    placeholder="you@example.com"
                  />
                </div>

                {loginMethod === 'phrase' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1 ml-1">Secret Phrase</label>
                    <div className="relative">
                      <textarea
                        required
                        value={phrase}
                        onChange={(e) => setPhrase(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-blue transition-colors min-h-[100px] font-mono text-sm resize-none"
                        placeholder="Enter your 12 words..."
                      />
                    </div>
                  </div>
                )}

                {loginMethod === 'otp' && (
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex gap-3 items-start">
                    <Mail className="text-blue-400 shrink-0 mt-0.5" size={18} />
                    <p className="text-xs text-blue-200/80">
                      We'll send a secure login link to your email. No password required.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-neon-blue text-black font-bold rounded-xl hover:bg-cyan-400 transition-colors disabled:opacity-50 shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                >
                  {loading ? "Verifying..." : loginMethod === 'phrase' ? "Unlock Vault" : "Send Login Link"}
                </button>
              </form>
            </div>
          )}

          {/* Toggle View */}
          <div className="mt-8 text-center">
            <button
              onClick={() => setView(view === 'login' ? 'signup' : 'login')}
              className="text-sm text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-2 mx-auto group"
            >
              {view === 'login' ? "New to NightHub?" : "Already have an identity?"}
              <span className="text-neon-blue group-hover:underline">
                {view === 'login' ? "Create Account" : "Login"}
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}