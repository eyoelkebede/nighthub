"use client";

import { Gamepad2, Play, Trophy, Star, Tv, X, Swords } from "lucide-react";
import { useAppStore } from "@/store/useStore";
import { useState } from "react";
import SpaceCrew from "@/components/Games/SpaceCrew";
import SolitaireStakes from "@/components/Games/SolitaireStakes";
import NeonCycles from "@/components/Games/NeonCycles";
import CyberRacer from "@/components/Games/CyberRacer";
import CosmicDefense from "@/components/Games/CosmicDefense";
import MultiplayerLobby from "@/components/Games/MultiplayerLobby";

const GAMES = [
  { 
    id: 1, 
    name: "Cyber Racer: Infinity", 
    type: 'solo',
    reward: "0.01 ETH", 
    image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=60", 
    sponsor: "Tesla", 
    component: CyberRacer 
  },
  { 
    id: 2, 
    name: "Cosmic Defense", 
    type: 'solo',
    reward: "0.008 ETH", 
    image: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=800&auto=format&fit=crop&q=60", 
    sponsor: "NASA", 
    component: CosmicDefense 
  },
  { 
    id: 3, 
    name: "Neon Cycles 3D", 
    type: 'pvp',
    reward: "PVP Betting", 
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=60", 
    sponsor: "NightHub Arena", 
    component: NeonCycles 
  },
  { 
    id: 4, 
    name: "Solitaire Stakes", 
    type: 'solo', 
    reward: "House Betting", 
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=60", 
    sponsor: "Casino Royale", 
    component: SolitaireStakes 
  },
];

export default function GameHub() {
  const { addEarnings } = useAppStore();
  const [playing, setPlaying] = useState<number | null>(null);
  const [watchingAd, setWatchingAd] = useState<number | null>(null);
  const [activeGameId, setActiveGameId] = useState<number | null>(null);
  const [lobbyGame, setLobbyGame] = useState<any>(null);

  const handlePlay = (id: number) => {
    const game = GAMES.find(g => g.id === id);
    if (!game) return;

    if (game.type === 'pvp') {
      setLobbyGame(game);
      return;
    }

    // If game has a component, launch it directly (or after ad)
    if (game.component) {
      if (game.id === 4) {
        // Solitaire doesn't need ad, it's betting
        setActiveGameId(id);
        return;
      }
    }

    // Step 1: Watch Ad (The "Middleman" Model)
    setWatchingAd(id);
    
    setTimeout(() => {
      // Ad Finished
      setWatchingAd(null);
      
      if (game.component) {
        setActiveGameId(id);
      } else {
        // Legacy simulation
        setPlaying(id);
      }
    }, 2000); // 2 second ad
  };

  const handleGameOver = (score?: number) => {
    setActiveGameId(null);
    if (typeof score === 'number') {
      addEarnings(0.005, 'gaming');
      alert(`Game Over! Score: ${score}. You earned 0.005 ETH.`);
    }
  };

  const ActiveGameComponent = activeGameId ? GAMES.find(g => g.id === activeGameId)?.component : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-bold text-lg">Game Arena</h3>
        <button className="text-neon-purple text-xs hover:underline">View All</button>
      </div>

      {lobbyGame && (
        <MultiplayerLobby 
          gameId={lobbyGame.id} 
          gameName={lobbyGame.name} 
          GameComponent={lobbyGame.component} 
          onClose={() => setLobbyGame(null)} 
        />
      )}

      {activeGameId && ActiveGameComponent ? (
        <div className="relative">
          <button 
            onClick={() => setActiveGameId(null)}
            className="absolute -top-3 -right-3 z-10 p-2 bg-zinc-800 rounded-full border border-white/20 text-white hover:bg-red-500 transition-colors"
          >
            <X size={16} />
          </button>
          <ActiveGameComponent onGameOver={handleGameOver} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {GAMES.map((game) => (
            <div key={game.id} className="group relative h-40 rounded-2xl overflow-hidden border border-white/10 cursor-pointer" onClick={() => handlePlay(game.id)}>
              <img src={game.image} alt={game.name} className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
              
              <div className="absolute inset-0 p-6 flex flex-col justify-center">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-white font-bold text-xl mb-1">{game.name}</h4>
                    <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-gray-300">Sponsored by {game.sponsor}</span>
                  </div>
                  {game.type === 'pvp' && (
                    <div className="bg-neon-blue/20 text-neon-blue px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      <Swords size={12} /> PVP
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 text-neon-purple text-xs font-mono bg-black/50 w-fit px-2 py-1 rounded-lg backdrop-blur-sm mt-auto">
                  <Tv size={12} />
                  <span>{game.type === 'pvp' ? "Bet & Win (1.5% Fee)" : game.id === 4 ? "House Betting" : "Watch Ad to Play"}</span>
                </div>
              </div>

              <div className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center group-hover:bg-neon-purple transition-colors">
                {watchingAd === game.id ? (
                  <div className="text-xs font-bold text-white animate-pulse">AD</div>
                ) : playing === game.id ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Play size={24} fill="white" className="text-white ml-1" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
