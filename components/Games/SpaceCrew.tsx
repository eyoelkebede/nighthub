"use client";

import { useEffect, useRef, useState } from "react";
import { Play, CheckCircle, Skull } from "lucide-react";
import { useAppStore } from "@/store/useStore";

interface Entity3D {
  x: number;
  y: number;
  z: number;
  radius: number;
  color: string;
  vx: number;
  vz: number;
  type: 'player' | 'imposter' | 'task';
}

export default function SpaceCrew() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'won'>('start');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const { addEarnings } = useAppStore();

  // Game State Refs
  const playerRef = useRef<Entity3D>({ x: 0, y: 0, z: 0, radius: 20, color: '#00ff9d', vx: 0, vz: 0, type: 'player' });
  const impostersRef = useRef<Entity3D[]>([]);
  const tasksRef = useRef<Entity3D[]>([]);
  const animationFrameRef = useRef<number>();
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const touchRef = useRef<{ x: number, y: number } | null>(null);

  // 3D Camera Settings
  const CAMERA_HEIGHT = 400;
  const CAMERA_Z_OFFSET = -300;
  const FOV = 400;

  const initGame = () => {
    playerRef.current = { x: 0, y: 0, z: 0, radius: 20, color: '#00ff9d', vx: 0, vz: 0, type: 'player' };
    
    // Create Imposters (3D positions)
    impostersRef.current = Array.from({ length: 4 }).map(() => ({
      x: (Math.random() - 0.5) * 800,
      y: 0, // Ground level
      z: (Math.random() - 0.5) * 800,
      radius: 25,
      color: '#ff0055',
      vx: (Math.random() - 0.5) * 8,
      vz: (Math.random() - 0.5) * 8,
      type: 'imposter'
    }));

    // Create Tasks
    tasksRef.current = Array.from({ length: 8 }).map(() => ({
      x: (Math.random() - 0.5) * 800,
      y: 10, // Floating slightly
      z: (Math.random() - 0.5) * 800,
      radius: 15,
      color: '#ffd700',
      vx: 0,
      vz: 0,
      type: 'task'
    }));

    setScore(0);
    setTimeLeft(30);
    setGameState('playing');
  };

  // Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => keysRef.current[e.code] = true;
    const handleKeyUp = (e: KeyboardEvent) => keysRef.current[e.code] = false;
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Timer
  useEffect(() => {
    if (gameState !== 'playing') return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setGameState('won');
          addEarnings(0.005, 'gaming');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState]);

  // Game Loop
  useEffect(() => {
    if (gameState !== 'playing' || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const project = (x: number, y: number, z: number) => {
      // Simple perspective projection
      // Camera is at (player.x, CAMERA_HEIGHT, player.z + CAMERA_Z_OFFSET) looking at player
      
      // Relative to camera
      const camX = playerRef.current.x;
      const camZ = playerRef.current.z + CAMERA_Z_OFFSET;
      
      const relX = x - camX;
      const relY = y; // y is up
      const relZ = z - camZ;

      // If behind camera, don't render (or handle clipping)
      if (relZ <= 0) return null;

      const scale = FOV / relZ;
      const screenX = canvas.width / 2 + relX * scale;
      const screenY = canvas.height / 2 + (CAMERA_HEIGHT - relY) * scale * 0.5; // Tilt effect

      return { x: screenX, y: screenY, scale };
    };

    const update = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Clear
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, width, height);

      // Movement Logic
      const speed = 5;
      if (keysRef.current['ArrowUp'] || keysRef.current['KeyW']) playerRef.current.z += speed;
      if (keysRef.current['ArrowDown'] || keysRef.current['KeyS']) playerRef.current.z -= speed;
      if (keysRef.current['ArrowLeft'] || keysRef.current['KeyA']) playerRef.current.x -= speed;
      if (keysRef.current['ArrowRight'] || keysRef.current['KeyD']) playerRef.current.x += speed;

      // Touch Controls
      if (touchRef.current) {
        const dx = touchRef.current.x - width / 2;
        const dy = touchRef.current.y - height / 2;
        const angle = Math.atan2(dy, dx);
        // Map screen angle to world movement (approximate)
        playerRef.current.x += Math.cos(angle) * speed;
        playerRef.current.z -= Math.sin(angle) * speed; // Inverted Y for Z
      }

      // Draw 3D Grid (Floor)
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1;
      const gridSize = 100;
      const range = 10; // Draw 10 grids in each direction
      
      // Snap grid to player position for infinite floor illusion
      const startX = Math.floor(playerRef.current.x / gridSize) * gridSize - (range * gridSize);
      const startZ = Math.floor(playerRef.current.z / gridSize) * gridSize - (range * gridSize);

      for (let i = 0; i < range * 2; i++) {
        for (let j = 0; j < range * 2; j++) {
          const x = startX + i * gridSize;
          const z = startZ + j * gridSize;
          
          const p1 = project(x, 0, z);
          const p2 = project(x + gridSize, 0, z);
          const p3 = project(x + gridSize, 0, z + gridSize);
          const p4 = project(x, 0, z + gridSize);

          if (p1 && p2 && p3 && p4) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(p3.x, p3.y);
            ctx.lineTo(p4.x, p4.y);
            ctx.closePath();
            ctx.stroke();
          }
        }
      }

      // Collect all entities to sort by Z (Painter's Algorithm)
      const allEntities = [
        playerRef.current,
        ...impostersRef.current,
        ...tasksRef.current
      ].sort((a, b) => b.z - a.z); // Draw furthest first? No, draw furthest first (highest Z relative to camera... wait)
      // Camera is at Z - 300 looking at Z. Higher Z is further away.
      // Actually, standard Z: Camera at -Z looking +Z.
      // Let's sort by distance to camera (relZ).
      // relZ = entity.z - (player.z - 300).
      // Larger relZ = further away. Draw large relZ first.
      
      allEntities.sort((a, b) => {
        const distA = a.z - (playerRef.current.z + CAMERA_Z_OFFSET);
        const distB = b.z - (playerRef.current.z + CAMERA_Z_OFFSET);
        return distB - distA;
      });

      allEntities.forEach(entity => {
        // Update Imposters
        if (entity.type === 'imposter') {
          entity.x += entity.vx;
          entity.z += entity.vz;
          // Bounce within a virtual arena relative to player? Or just infinite?
          // Let's make them chase player slightly
          const dx = playerRef.current.x - entity.x;
          const dz = playerRef.current.z - entity.z;
          const dist = Math.hypot(dx, dz);
          if (dist < 800) { // Only chase if close
            entity.x += (dx / dist) * 2;
            entity.z += (dz / dist) * 2;
          }
          
          // Collision
          if (dist < entity.radius + playerRef.current.radius) {
            setGameState('gameover');
          }
        }

        // Update Tasks (Bobbing)
        if (entity.type === 'task') {
          entity.y = 10 + Math.sin(Date.now() / 200) * 5;
          const dist = Math.hypot(entity.x - playerRef.current.x, entity.z - playerRef.current.z);
          if (dist < entity.radius + playerRef.current.radius) {
            // Collect
            const idx = tasksRef.current.indexOf(entity);
            if (idx > -1) {
              tasksRef.current.splice(idx, 1);
              setScore(s => s + 1);
              // Respawn far away
              tasksRef.current.push({
                x: playerRef.current.x + (Math.random() - 0.5) * 1000,
                y: 10,
                z: playerRef.current.z + (Math.random() - 0.5) * 1000,
                radius: 15,
                color: '#ffd700',
                vx: 0,
                vz: 0,
                type: 'task'
              });
            }
            return; // Don't draw if collected this frame
          }
        }

        // Draw Entity
        const proj = project(entity.x, entity.y, entity.z);
        if (proj) {
          // Shadow
          const shadowProj = project(entity.x, 0, entity.z);
          if (shadowProj) {
            ctx.beginPath();
            ctx.ellipse(shadowProj.x, shadowProj.y, entity.radius * shadowProj.scale, entity.radius * shadowProj.scale * 0.3, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fill();
          }

          // Body
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, entity.radius * proj.scale, 0, Math.PI * 2);
          
          // Gradient for 3D effect
          const grad = ctx.createRadialGradient(
            proj.x - entity.radius * proj.scale * 0.3, 
            proj.y - entity.radius * proj.scale * 0.3, 
            0, 
            proj.x, 
            proj.y, 
            entity.radius * proj.scale
          );
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.3, entity.color);
          grad.addColorStop(1, '#000000');
          
          ctx.fillStyle = grad;
          ctx.fill();
          
          // Glow
          ctx.shadowBlur = 20;
          ctx.shadowColor = entity.color;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      animationFrameRef.current = requestAnimationFrame(update);
    };

    update();
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [gameState]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      touchRef.current = {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
  };

  const handleTouchEnd = () => {
    touchRef.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      touchRef.current = {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
  };

  return (
    <div className="w-full bg-zinc-900 rounded-3xl overflow-hidden border border-white/10 relative">
      <div className="absolute top-4 left-4 z-10 flex gap-4">
        <div className="bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-white font-mono text-sm">
          Tasks: {score}
        </div>
        <div className="bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-white font-mono text-sm">
          Time: {timeLeft}s
        </div>
      </div>

      {gameState === 'start' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
          <h2 className="text-3xl font-bold text-white mb-2">Space Survivor 3D</h2>
          <p className="text-gray-400 mb-6 text-center max-w-xs">Use WASD or Touch to move. Collect Gold. Avoid Red.</p>
          <button 
            onClick={initGame}
            className="flex items-center gap-2 bg-neon-green text-black px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform"
          >
            <Play size={20} /> Start Mission
          </button>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-red-900/80 backdrop-blur-sm">
          <Skull size={48} className="text-white mb-4" />
          <h2 className="text-3xl font-bold text-white mb-2">Eliminated</h2>
          <button 
            onClick={initGame}
            className="bg-white text-red-900 px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform"
          >
            Try Again
          </button>
        </div>
      )}

      {gameState === 'won' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-green-900/80 backdrop-blur-sm">
          <CheckCircle size={48} className="text-white mb-4" />
          <h2 className="text-3xl font-bold text-white mb-2">Mission Complete</h2>
          <p className="text-white/80 mb-6">You earned 0.005 ETH!</p>
          <button 
            onClick={initGame}
            className="bg-white text-green-900 px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform"
          >
            Play Again
          </button>
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        className="w-full h-[300px] md:h-[500px] bg-black touch-none"
      />
    </div>
  );
}