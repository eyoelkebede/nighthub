"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, ArrowDown, DollarSign, Trophy, RefreshCw } from "lucide-react";
import { useAppStore } from "@/store/useStore";

const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

interface Card {
  suit: string;
  value: string;
  numericValue: number;
  color: string;
}

interface SolitaireStakesProps {
  onGameOver?: () => void;
}

export default function SolitaireStakes({ onGameOver }: SolitaireStakesProps) {
  const { finance, deductEarnings, addEarnings } = useAppStore();
  const [betAmount, setBetAmount] = useState(0.01);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'lost' | 'won'>('idle');
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [nextCard, setNextCard] = useState<Card | null>(null);
  const [streak, setStreak] = useState(0);
  const [multiplier, setMultiplier] = useState(1.0);
  const [isFlipping, setIsFlipping] = useState(false);

  const generateCard = (): Card => {
    const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
    const valueIndex = Math.floor(Math.random() * VALUES.length);
    const value = VALUES[valueIndex];
    return {
      suit,
      value,
      numericValue: valueIndex + 2,
      color: (suit === '♥' || suit === '♦') ? 'text-red-500' : 'text-black'
    };
  };

  const startGame = () => {
    if (finance.totalEarnings < betAmount) {
      alert("Insufficient funds in Vault!");
      return;
    }
    
    if (deductEarnings(betAmount)) {
      setGameState('playing');
      setCurrentCard(generateCard());
      setNextCard(null);
      setStreak(0);
      setMultiplier(1.0);
    }
  };

  const handleGuess = (guess: 'higher' | 'lower') => {
    setIsFlipping(true);
    const newCard = generateCard();
    
    // Delay to show flip animation
    setTimeout(() => {
      setNextCard(newCard);
      setIsFlipping(false);

      // Compare
      const isHigher = newCard.numericValue > currentCard!.numericValue;
      const isLower = newCard.numericValue < currentCard!.numericValue;
      const isEqual = newCard.numericValue === currentCard!.numericValue;

      let won = false;
      if (guess === 'higher' && isHigher) won = true;
      if (guess === 'lower' && isLower) won = true;
      if (isEqual) won = true; // Push on tie

      setTimeout(() => {
        if (won) {
          setCurrentCard(newCard);
          setNextCard(null);
          setStreak(s => s + 1);
          setMultiplier(m => m * 1.5);
          
          if (streak + 1 >= 5) {
            // Jackpot
            const winAmount = betAmount * (multiplier * 1.5);
            addEarnings(winAmount, 'gaming');
            setGameState('won');
          }
        } else {
          setGameState('lost');
        }
      }, 1000);
    }, 600);
  };

  const cashOut = () => {
    const winAmount = betAmount * multiplier;
    addEarnings(winAmount, 'gaming');
    setGameState('idle');
    alert(`Cashed out ${winAmount.toFixed(4)} ETH!`);
    if (onGameOver) onGameOver();
  };

  return (
    <div className="w-full bg-[#0a3c0a] rounded-3xl p-6 border-4 border-[#4a2c0f] relative overflow-hidden perspective-1000 shadow-2xl">
      {/* Felt Texture */}
      <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] pointer-events-none" />
      
      <div className="flex justify-between items-center mb-6 relative z-10">
        <div>
          <h3 className="text-xl font-bold text-[#ffd700] drop-shadow-md font-serif">Royal Stakes</h3>
          <p className="text-green-200 text-xs">High Stakes Solitaire</p>
        </div>
        <div className="bg-black/40 px-3 py-1 rounded-full border border-white/10 flex items-center gap-2 backdrop-blur-sm">
          <DollarSign size={14} className="text-[#ffd700]" />
          <span className="text-white font-mono">{finance.totalEarnings.toFixed(4)}</span>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center min-h-[400px] relative z-0">
        {gameState === 'idle' || gameState === 'lost' || gameState === 'won' ? (
          <div className="text-center space-y-6 relative z-20">
            {gameState === 'lost' && <div className="text-red-500 font-bold text-2xl mb-2 drop-shadow-md">House Wins</div>}
            {gameState === 'won' && <div className="text-[#ffd700] font-bold text-2xl mb-2 drop-shadow-md">Jackpot!</div>}
            
            <div className="bg-black/60 p-6 rounded-2xl border border-[#ffd700]/30 w-72 shadow-xl backdrop-blur-md">
              <label className="text-[#ffd700] text-xs uppercase tracking-wider mb-4 block font-bold">Place Your Bet</label>
              <div className="flex items-center gap-3">
                <button onClick={() => setBetAmount(Math.max(0.001, betAmount - 0.001))} className="w-10 h-10 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors">-</button>
                <div className="flex-1 bg-black/40 rounded-lg py-2 border border-white/10">
                  <input 
                    type="number" 
                    value={betAmount}
                    onChange={(e) => setBetAmount(parseFloat(e.target.value))}
                    className="bg-transparent text-center text-white font-bold w-full focus:outline-none text-xl font-mono"
                  />
                </div>
                <button onClick={() => setBetAmount(betAmount + 0.001)} className="w-10 h-10 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors">+</button>
              </div>
            </div>

            <button 
              onClick={startGame}
              className="w-full bg-gradient-to-b from-[#ffd700] to-[#b8860b] text-black font-bold py-4 rounded-xl hover:scale-105 transition-transform flex items-center justify-center gap-2 shadow-lg shadow-yellow-900/50 border-t border-white/40"
            >
              {gameState === 'idle' ? 'Deal Cards' : 'Play Again'}
            </button>
          </div>
        ) : (
          <div className="w-full max-w-sm transform-style-3d rotate-x-10">
            {/* Game Area */}
            <div className="flex justify-center gap-8 mb-12 transform-style-3d">
              {/* Current Card */}
              <motion.div 
                layoutId="card"
                className="w-36 h-56 bg-white rounded-xl flex flex-col items-center justify-between p-4 relative shadow-2xl transform-style-3d transition-transform hover:translate-z-10"
                style={{ transform: 'rotateX(5deg)' }}
              >
                <div className="w-full flex justify-start">
                  <div className="flex flex-col items-center">
                    <span className={`text-2xl font-bold ${currentCard?.color}`}>{currentCard?.value}</span>
                    <span className={`text-xl ${currentCard?.color}`}>{currentCard?.suit}</span>
                  </div>
                </div>
                <span className={`text-6xl ${currentCard?.color}`}>{currentCard?.suit}</span>
                <div className="w-full flex justify-end rotate-180">
                  <div className="flex flex-col items-center">
                    <span className={`text-2xl font-bold ${currentCard?.color}`}>{currentCard?.value}</span>
                    <span className={`text-xl ${currentCard?.color}`}>{currentCard?.suit}</span>
                  </div>
                </div>
                {/* Card Thickness */}
                <div className="absolute inset-0 border border-gray-300 rounded-xl translate-z-1" />
              </motion.div>

              {/* Next Card Placeholder / Flip */}
              <div className="w-36 h-56 relative perspective-1000">
                <motion.div 
                  className="w-full h-full relative transform-style-3d transition-all duration-500"
                  style={{ transform: nextCard ? 'rotateY(0deg)' : 'rotateY(180deg)' }}
                >
                  {/* Front Face (The Card) */}
                  <div className="absolute inset-0 bg-white rounded-xl flex flex-col items-center justify-between p-4 backface-hidden shadow-2xl">
                    {nextCard && (
                      <>
                        <div className="w-full flex justify-start">
                          <div className="flex flex-col items-center">
                            <span className={`text-2xl font-bold ${nextCard.color}`}>{nextCard.value}</span>
                            <span className={`text-xl ${nextCard.color}`}>{nextCard.suit}</span>
                          </div>
                        </div>
                        <span className={`text-6xl ${nextCard.color}`}>{nextCard.suit}</span>
                        <div className="w-full flex justify-end rotate-180">
                          <div className="flex flex-col items-center">
                            <span className={`text-2xl font-bold ${nextCard.color}`}>{nextCard.value}</span>
                            <span className={`text-xl ${nextCard.color}`}>{nextCard.suit}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Back Face (The Deck Pattern) */}
                  <div className="absolute inset-0 bg-[#1a237e] rounded-xl backface-hidden flex items-center justify-center border-4 border-white shadow-xl" style={{ transform: 'rotateY(180deg)' }}>
                    <div className="w-full h-full opacity-30 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')]" />
                    <div className="absolute inset-2 border-2 border-[#ffd700]/50 rounded-lg" />
                    <div className="text-[#ffd700] font-serif font-bold text-4xl">NH</div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Controls */}
            {!nextCard && !isFlipping && (
              <div className="grid grid-cols-2 gap-4 transform translate-z-20">
                <button 
                  onClick={() => handleGuess('higher')}
                  className="bg-gradient-to-b from-zinc-700 to-zinc-800 border border-white/10 p-4 rounded-xl flex flex-col items-center gap-2 transition-all hover:-translate-y-1 hover:shadow-lg active:scale-95"
                >
                  <ArrowUp className="text-green-400 w-8 h-8" />
                  <span className="text-white font-bold text-lg">HIGHER</span>
                </button>
                <button 
                  onClick={() => handleGuess('lower')}
                  className="bg-gradient-to-b from-zinc-700 to-zinc-800 border border-white/10 p-4 rounded-xl flex flex-col items-center gap-2 transition-all hover:-translate-y-1 hover:shadow-lg active:scale-95"
                >
                  <ArrowDown className="text-red-400 w-8 h-8" />
                  <span className="text-white font-bold text-lg">LOWER</span>
                </button>
              </div>
            )}

            {/* Stats */}
            <div className="mt-8 flex justify-between items-center bg-black/60 backdrop-blur-md p-4 rounded-xl border border-[#ffd700]/20 transform translate-z-10 shadow-lg">
              <div>
                <div className="text-gray-400 text-xs uppercase tracking-wider">Current Win</div>
                <div className="text-[#ffd700] font-bold font-mono text-lg">{(betAmount * multiplier).toFixed(4)} ETH</div>
              </div>
              <div className="text-right">
                <div className="text-gray-400 text-xs uppercase tracking-wider">Streak</div>
                <div className="text-white font-bold text-lg">{streak} / 5</div>
              </div>
            </div>

            {streak > 0 && !nextCard && (
              <button 
                onClick={cashOut}
                className="w-full mt-4 bg-green-600/20 border border-green-500/50 text-green-400 py-3 rounded-xl font-bold hover:bg-green-600/30 transition-colors transform translate-z-30 hover:scale-105"
              >
                CASH OUT
              </button>
            )}
          </div>
        )}
      </div>
      
      <style jsx global>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-x-10 { transform: rotateX(10deg); }
        .translate-z-1 { transform: translateZ(1px); }
        .translate-z-10 { transform: translateZ(10px); }
        .translate-z-20 { transform: translateZ(20px); }
        .translate-z-30 { transform: translateZ(30px); }
      `}</style>
    </div>
  );
}