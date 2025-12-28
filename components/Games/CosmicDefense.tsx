"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Crosshair, Shield, Zap } from "lucide-react";

interface CosmicDefenseProps {
  onGameOver: (score: number) => void;
}

export default function CosmicDefense({ onGameOver }: CosmicDefenseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(100);
  
  const gameState = useRef({
    running: true,
    enemies: [] as any[],
    bullets: [] as any[],
    particles: [] as any[],
    lastTime: 0,
    spawnTimer: 0
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    // Input
    const handleTouch = (e: TouchEvent | MouseEvent) => {
      e.preventDefault();
      const x = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const y = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      
      // Shoot
      gameState.current.bullets.push({
        x: (x - canvas.width / 2) * 2, // Map screen to world approx
        y: (y - canvas.height / 2) * 2,
        z: 0,
        vx: (x - canvas.width / 2) * 0.1,
        vy: (y - canvas.height / 2) * 0.1,
        vz: 50
      });
    };
    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('mousedown', handleTouch);

    // 3D Projection
    const project = (x: number, y: number, z: number) => {
      const fov = 500;
      const scale = fov / (z + fov);
      return {
        x: canvas.width / 2 + x * scale,
        y: canvas.height / 2 + y * scale,
        scale: scale
      };
    };

    let animationId: number;
    const loop = (time: number) => {
      if (!gameState.current.running) return;
      const dt = (time - gameState.current.lastTime) / 16; // Normalize to ~60fps
      gameState.current.lastTime = time;

      // Clear
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Starfield
      ctx.fillStyle = '#fff';
      for(let i=0; i<50; i++) {
        const x = Math.sin(time * 0.0001 + i) * canvas.width;
        const y = Math.cos(time * 0.0002 + i * 2) * canvas.height;
        ctx.fillRect((x + canvas.width)%canvas.width, (y + canvas.height)%canvas.height, 1, 1);
      }

      // Spawn Enemies
      gameState.current.spawnTimer += dt;
      if (gameState.current.spawnTimer > 30) {
        gameState.current.spawnTimer = 0;
        gameState.current.enemies.push({
          x: (Math.random() - 0.5) * 2000,
          y: (Math.random() - 0.5) * 1000,
          z: 2000, // Far away
          color: `hsl(${Math.random() * 360}, 100%, 50%)`
        });
      }

      // Update & Draw Bullets
      ctx.fillStyle = '#00ffff';
      gameState.current.bullets.forEach((b, i) => {
        b.z += b.vz * dt;
        b.x += b.vx * dt * 0.1;
        b.y += b.vy * dt * 0.1;
        
        const p = project(b.x, b.y, b.z);
        const size = 5 * p.scale;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();

        if (b.z > 3000) gameState.current.bullets.splice(i, 1);
      });

      // Update & Draw Enemies
      gameState.current.enemies.forEach((e, i) => {
        e.z -= 10 * dt; // Move towards player
        
        // Collision with player
        if (e.z < -100) {
          setHealth(h => Math.max(0, h - 10));
          gameState.current.enemies.splice(i, 1);
          // Screen shake effect could go here
        }

        // Collision with bullets
        gameState.current.bullets.forEach((b, bi) => {
          if (Math.abs(b.z - e.z) < 100 && Math.abs(b.x - e.x) < 100 && Math.abs(b.y - e.y) < 100) {
            // Hit
            gameState.current.enemies.splice(i, 1);
            gameState.current.bullets.splice(bi, 1);
            setScore(s => s + 100);
            
            // Explosion particles
            for(let p=0; p<10; p++) {
              gameState.current.particles.push({
                x: e.x, y: e.y, z: e.z,
                vx: (Math.random()-0.5)*20, vy: (Math.random()-0.5)*20, vz: (Math.random()-0.5)*20,
                life: 1.0, color: e.color
              });
            }
          }
        });

        const p = project(e.x, e.y, e.z);
        const size = 40 * p.scale;
        
        ctx.shadowBlur = 20;
        ctx.shadowColor = e.color;
        ctx.fillStyle = e.color;
        
        // Draw Enemy Ship (Triangle)
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - size);
        ctx.lineTo(p.x - size, p.y + size);
        ctx.lineTo(p.x + size, p.y + size);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Particles
      gameState.current.particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy; p.z += p.vz;
        p.life -= 0.05;
        if (p.life <= 0) {
          gameState.current.particles.splice(i, 1);
          return;
        }
        const proj = project(p.x, p.y, p.z);
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(proj.x, proj.y, 4 * proj.scale, 4 * proj.scale);
        ctx.globalAlpha = 1;
      });

      if (health <= 0) {
        gameState.current.running = false;
        onGameOver(score);
      }

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, [health]);

  return (
    <div className="fixed inset-0 z-50 bg-black cursor-crosshair">
      <canvas ref={canvasRef} className="w-full h-full block" />
      
      {/* HUD */}
      <div className="absolute top-4 left-4 right-4 flex justify-between pointer-events-none">
        <div className="flex items-center gap-2">
          <Shield className={health < 30 ? "text-red-500 animate-pulse" : "text-neon-blue"} />
          <div className="w-32 h-4 bg-gray-800 rounded-full overflow-hidden border border-white/20">
            <div className="h-full bg-neon-blue transition-all duration-300" style={{ width: `${health}%` }} />
          </div>
        </div>
        <div className="text-neon-green font-mono font-bold text-2xl">{score}</div>
      </div>

      {/* Crosshair Overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
        <Crosshair size={48} className="text-white" />
      </div>

      <button 
        onClick={() => onGameOver(score)}
        className="absolute top-4 right-4 pointer-events-auto bg-red-500/20 text-red-500 p-2 rounded-full hover:bg-red-500/40"
      >
        ✕
      </button>
    </div>
  );
}