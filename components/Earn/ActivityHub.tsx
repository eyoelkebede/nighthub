"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Navigation, Zap, Box, X, Trophy, AlertTriangle } from "lucide-react";
import { useAppStore, TradingCard } from "@/store/useStore";

const CARDS_DB: Omit<TradingCard, 'id' | 'foundAt'>[] = [
  { name: "Neon Drifter", rarity: "Common", value: 0.001, imageUrl: "https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=400&q=80" },
  { name: "Cyber Katana", rarity: "Rare", value: 0.005, imageUrl: "https://images.unsplash.com/photo-1535378437327-b7128d612d52?w=400&q=80" },
  { name: "Glitch Ghost", rarity: "Epic", value: 0.02, imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80" },
  { name: "Quantum Core", rarity: "Legendary", value: 0.1, imageUrl: "https://images.unsplash.com/photo-1614728263952-84ea256f9679?w=400&q=80" },
  { name: "Street Rat", rarity: "Common", value: 0.0005, imageUrl: "https://images.unsplash.com/photo-1495554605298-8d361248d249?w=400&q=80" },
];

const SPEED_LIMIT_KMH = 25;
const DROP_CHANCE_PER_METER = 0.05; // 5% chance per meter (high for testing)

export default function ActivityHub() {
  const { finance, updateSteps, addEarnings, addCard, inventory } = useAppStore();
  const [isTracking, setIsTracking] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [foundItem, setFoundItem] = useState<TradingCard | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const lastPos = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const watchId = useRef<number | null>(null);

  // Haversine formula for distance
  const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const deg2rad = (deg: number) => deg * (Math.PI / 180);

  const startTracking = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser");
      return;
    }

    setIsTracking(true);
    setErrorMsg(null);

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed: gpsSpeed } = position.coords;
        const now = Date.now();

        // Update location for UI
        setLocation({ lat: latitude, lng: longitude });

        if (lastPos.current) {
          const distKm = getDistanceFromLatLonInKm(
            lastPos.current.lat, lastPos.current.lng,
            latitude, longitude
          );
          const timeDiffHours = (now - lastPos.current.time) / 1000 / 3600;
          
          // Calculate speed if GPS speed is null (often is on some devices)
          const calculatedSpeed = gpsSpeed !== null ? (gpsSpeed * 3.6) : (distKm / timeDiffHours);
          
          setSpeed(calculatedSpeed);

          if (calculatedSpeed > SPEED_LIMIT_KMH) {
            setErrorMsg("Moving too fast! No rewards for driving/flying.");
          } else {
            setErrorMsg(null);
            // Accumulate distance
            if (distKm > 0.005) { // Ignore tiny jitter
              setDistance(d => d + distKm);
              const steps = Math.floor(distKm * 1312); // Approx steps per km
              updateSteps(finance.dailySteps + steps);
              
              // Chance to find item
              if (Math.random() < DROP_CHANCE_PER_METER * (distKm * 1000)) {
                spawnLoot();
              }
            }
          }
        }

        lastPos.current = { lat: latitude, lng: longitude, time: now };
      },
      (err) => setErrorMsg(err.message),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );
  };

  const stopTracking = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setIsTracking(false);
    setSpeed(0);
  };

  const spawnLoot = () => {
    const template = CARDS_DB[Math.floor(Math.random() * CARDS_DB.length)];
    const newCard: TradingCard = {
      ...template,
      id: Math.random().toString(36).substr(2, 9),
      foundAt: new Date().toISOString()
    };
    setFoundItem(newCard);
    addCard(newCard);
    addEarnings(template.value, 'walking'); // Bonus for finding card
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, []);

  return (
    <div className="w-full bg-black rounded-3xl overflow-hidden relative min-h-[600px] border border-white/10 flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 z-20 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Navigation className="text-neon-blue" />
              NightWalker
            </h2>
            <p className="text-gray-400 text-xs">Explore. Collect. Earn.</p>
          </div>
          <div className="bg-zinc-900/80 backdrop-blur px-3 py-1 rounded-full border border-white/10">
            <span className="text-neon-green font-mono font-bold">{distance.toFixed(2)} km</span>
          </div>
        </div>
      </div>

      {/* Main Scanner View */}
      <div className="flex-1 relative flex items-center justify-center bg-zinc-900">
        {/* Grid Background */}
        <div className="absolute inset-0 opacity-20" 
             style={{ 
               backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)',
               backgroundSize: '40px 40px',
               transform: 'perspective(500px) rotateX(60deg) translateY(-100px) scale(2)'
             }} 
        />

        {/* Radar Ripples */}
        {isTracking && !errorMsg && (
          <>
            <motion.div 
              animate={{ scale: [1, 3], opacity: [0.5, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="absolute w-32 h-32 rounded-full border border-neon-blue/50"
            />
            <motion.div 
              animate={{ scale: [1, 3], opacity: [0.5, 0] }}
              transition={{ repeat: Infinity, duration: 2, delay: 1, ease: "linear" }}
              className="absolute w-32 h-32 rounded-full border border-neon-blue/30"
            />
          </>
        )}

        {/* User Avatar Marker */}
        <div className="relative z-10">
          <div className="w-4 h-4 bg-neon-blue rounded-full shadow-[0_0_20px_rgba(0,255,255,0.8)]" />
          <div className="absolute -top-10 -left-10 w-24 text-center">
            <span className="bg-black/50 text-white text-[10px] px-2 py-1 rounded backdrop-blur">You</span>
          </div>
        </div>

        {/* Speed Warning */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-32 bg-red-500/90 text-white px-6 py-3 rounded-xl flex items-center gap-3 backdrop-blur z-30"
            >
              <AlertTriangle size={20} />
              <span className="font-bold text-sm">{errorMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loot Found Modal */}
        <AnimatePresence>
          {foundItem && (
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
            >
              <div className="bg-zinc-900 border border-neon-purple/50 p-1 rounded-2xl w-full max-w-xs relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/20 to-transparent animate-pulse" />
                <div className="bg-black rounded-xl p-6 flex flex-col items-center text-center relative z-10">
                  <div className="text-neon-purple font-bold text-lg mb-2">ITEM FOUND!</div>
                  <img src={foundItem.imageUrl} alt={foundItem.name} className="w-32 h-32 object-cover rounded-lg mb-4 border-2 border-white/10" />
                  <h3 className="text-white font-bold text-xl">{foundItem.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded mt-2 ${
                    foundItem.rarity === 'Legendary' ? 'bg-yellow-500/20 text-yellow-500' :
                    foundItem.rarity === 'Epic' ? 'bg-purple-500/20 text-purple-500' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {foundItem.rarity}
                  </span>
                  <div className="mt-4 text-neon-green font-mono">+{foundItem.value} ETH</div>
                  
                  <button 
                    onClick={() => setFoundItem(null)}
                    className="mt-6 w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-gray-200"
                  >
                    Collect
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls & Stats */}
      <div className="bg-zinc-900 p-6 z-20 border-t border-white/5">
        <div className="flex justify-between items-center mb-6">
          <div className="text-center">
            <div className="text-gray-500 text-xs uppercase tracking-wider">Speed</div>
            <div className="text-white font-mono text-xl">{speed.toFixed(1)} <span className="text-xs text-gray-500">km/h</span></div>
          </div>
          <div className="text-center">
            <div className="text-gray-500 text-xs uppercase tracking-wider">Steps</div>
            <div className="text-white font-mono text-xl">{finance.dailySteps.toLocaleString()}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-500 text-xs uppercase tracking-wider">Cards</div>
            <div className="text-white font-mono text-xl">{inventory.length}</div>
          </div>
        </div>

        <button
          onClick={isTracking ? stopTracking : startTracking}
          className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
            isTracking 
              ? "bg-red-500/20 text-red-500 border border-red-500/50 hover:bg-red-500/30" 
              : "bg-neon-blue text-black hover:scale-[1.02] shadow-[0_0_20px_rgba(0,255,255,0.3)]"
          }`}
        >
          {isTracking ? (
            <>
              <X /> Stop Scanning
            </>
          ) : (
            <>
              <Zap /> Start Scanning
            </>
          )}
        </button>
      </div>

      {/* Inventory Strip */}
      {inventory.length > 0 && (
        <div className="bg-black p-4 border-t border-white/5 overflow-x-auto">
          <div className="flex gap-3">
            {inventory.map((card) => (
              <div key={card.id} className="flex-shrink-0 w-20 h-28 bg-zinc-800 rounded-lg border border-white/10 overflow-hidden relative group">
                <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1">
                  <div className="text-[8px] text-white truncate text-center">{card.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
