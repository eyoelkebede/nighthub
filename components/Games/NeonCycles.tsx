"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface NeonCyclesProps {
  onGameOver: (winner: 'p1' | 'p2') => void;
  isMultiplayer?: boolean; // If true, we'd sync state. For now, local simulation.
}

export default function NeonCycles({ onGameOver }: NeonCyclesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [countdown, setCountdown] = useState(3);
  
  // Game State
  const gameState = useRef({
    p1: { x: -20, z: 0, dirX: 0, dirZ: 1, color: '#00ffff', trail: [] as {x:number, z:number}[], dead: false },
    p2: { x: 20, z: 0, dirX: 0, dirZ: 1, color: '#ff0055', trail: [] as {x:number, z:number}[], dead: false },
    camera: { x: 0, y: 100, z: -100 },
    running: false
  });

  useEffect(() => {
    // Countdown
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(timer);
          gameState.current.running = true;
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Controls
    const handleKeyDown = (e: KeyboardEvent) => {
      const p1 = gameState.current.p1;
      if (e.key === 'ArrowLeft' && p1.dirX === 0) { p1.dirX = -1; p1.dirZ = 0; }
      if (e.key === 'ArrowRight' && p1.dirX === 0) { p1.dirX = 1; p1.dirZ = 0; }
      if (e.key === 'ArrowUp' && p1.dirZ === 0) { p1.dirX = 0; p1.dirZ = 1; }
      if (e.key === 'ArrowDown' && p1.dirZ === 0) { p1.dirX = 0; p1.dirZ = -1; }
    };
    window.addEventListener('keydown', handleKeyDown);

    // AI Logic for P2
    const updateAI = () => {
      const p2 = gameState.current.p2;
      // Simple random turns for now, but avoid immediate death
      if (Math.random() < 0.05) {
        const turn = Math.random() > 0.5 ? 1 : -1;
        if (p2.dirZ !== 0) { p2.dirX = turn; p2.dirZ = 0; }
        else { p2.dirZ = turn; p2.dirX = 0; }
      }
      
      // Bounds check AI
      if (p2.x > 90 && p2.dirX === 1) { p2.dirX = 0; p2.dirZ = 1; }
      if (p2.x < -90 && p2.dirX === -1) { p2.dirX = 0; p2.dirZ = -1; }
      if (p2.z > 90 && p2.dirZ === 1) { p2.dirZ = 0; p2.dirX = -1; }
      if (p2.z < -90 && p2.dirZ === -1) { p2.dirZ = 0; p2.dirX = 1; }
    };

    // 3D Projection
    const project = (x: number, y: number, z: number) => {
      const cam = gameState.current.camera;
      const fov = 400;
      
      // Rotate camera around center slightly
      const angle = Date.now() * 0.0005;
      const camX = Math.sin(angle) * 150;
      const camZ = Math.cos(angle) * 150 - 50;
      
      const dx = x - camX;
      const dy = y - cam.y;
      const dz = z - camZ;

      // Rotation matrix for looking at center (0,0,0)
      const cosA = Math.cos(-angle);
      const sinA = Math.sin(-angle);
      
      const rx = dx * cosA - dz * sinA;
      const rz = dx * sinA + dz * cosA;

      if (rz <= 0) return null;

      const scale = fov / rz;
      return {
        x: canvas.width / 2 + rx * scale,
        y: canvas.height / 2 + dy * scale,
        scale: scale
      };
    };

    const checkCollision = (x: number, z: number, selfTrail: any[]) => {
      // Bounds
      if (Math.abs(x) > 100 || Math.abs(z) > 100) return true;
      
      // Trail collision
      // Check P1 trail
      for (const p of gameState.current.p1.trail) {
        if (Math.abs(p.x - x) < 2 && Math.abs(p.z - z) < 2) return true;
      }
      // Check P2 trail
      for (const p of gameState.current.p2.trail) {
        if (Math.abs(p.x - x) < 2 && Math.abs(p.z - z) < 2) return true;
      }
      return false;
    };

    let animationId: number;
    const loop = () => {
      if (!gameState.current.running) {
        if (!gameState.current.p1.dead && !gameState.current.p2.dead) {
           // Just render static if waiting
        } else {
           return; // Game over
        }
      } else {
        // Update Positions
        const speed = 1.5;
        const p1 = gameState.current.p1;
        const p2 = gameState.current.p2;

        // Save trails
        if (Math.floor(Date.now() / 50) % 2 === 0) {
            p1.trail.push({x: p1.x, z: p1.z});
            p2.trail.push({x: p2.x, z: p2.z});
        }

        p1.x += p1.dirX * speed;
        p1.z += p1.dirZ * speed;

        updateAI();
        p2.x += p2.dirX * speed;
        p2.z += p2.dirZ * speed;

        // Collisions
        if (checkCollision(p1.x, p1.z, p1.trail)) {
          p1.dead = true;
          gameState.current.running = false;
          onGameOver('p2');
        }
        if (checkCollision(p2.x, p2.z, p2.trail)) {
          p2.dead = true;
          gameState.current.running = false;
          onGameOver('p1');
        }
      }

      // Render
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Grid
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1;
      for (let i = -100; i <= 100; i += 20) {
        const p1 = project(i, 0, -100);
        const p2 = project(i, 0, 100);
        if (p1 && p2) { ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke(); }
        
        const p3 = project(-100, 0, i);
        const p4 = project(100, 0, i);
        if (p3 && p4) { ctx.beginPath(); ctx.moveTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.stroke(); }
      }

      // Draw Players & Trails
      [gameState.current.p1, gameState.current.p2].forEach(p => {
        // Trail
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        let first = true;
        p.trail.forEach(pt => {
          const proj = project(pt.x, 0, pt.z);
          if (proj) {
            if (first) { ctx.moveTo(proj.x, proj.y); first = false; }
            else ctx.lineTo(proj.x, proj.y);
          }
        });
        const head = project(p.x, 0, p.z);
        if (head) ctx.lineTo(head.x, head.y);
        ctx.stroke();

        // Bike (Box)
        if (head) {
          ctx.fillStyle = p.color;
          const size = head.scale * 4;
          ctx.fillRect(head.x - size/2, head.y - size, size, size);
          
          // Glow
          const g = ctx.createRadialGradient(head.x, head.y - size/2, 0, head.x, head.y - size/2, size * 2);
          g.addColorStop(0, p.color);
          g.addColorStop(1, 'transparent');
          ctx.fillStyle = g;
          ctx.fillRect(head.x - size*2, head.y - size*2, size*4, size*4);
        }
      });

      animationId = requestAnimationFrame(loop);
    };
    
    loop();
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="relative w-full h-[400px] bg-black rounded-xl overflow-hidden border border-white/10">
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={400} 
        className="w-full h-full object-cover"
      />
      
      {/* UI Overlay */}
      <div className="absolute top-4 left-4 text-neon-blue font-bold">YOU (P1)</div>
      <div className="absolute top-4 right-4 text-pink-500 font-bold">OPPONENT (P2)</div>

      {countdown > 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div 
            key={countdown}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 1 }}
            exit={{ scale: 2, opacity: 0 }}
            className="text-6xl font-bold text-white font-mono"
          >
            {countdown}
          </motion.div>
        </div>
      )}
      
      {/* Mobile Controls */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-between px-8 md:hidden">
        <button 
          className="w-16 h-16 bg-white/10 rounded-full backdrop-blur border border-white/20 active:bg-white/30"
          onTouchStart={() => { gameState.current.p1.dirX = -1; gameState.current.p1.dirZ = 0; }}
        >←</button>
        <div className="flex gap-4">
            <button 
            className="w-16 h-16 bg-white/10 rounded-full backdrop-blur border border-white/20 active:bg-white/30"
            onTouchStart={() => { gameState.current.p1.dirX = 0; gameState.current.p1.dirZ = 1; }}
            >↑</button>
            <button 
            className="w-16 h-16 bg-white/10 rounded-full backdrop-blur border border-white/20 active:bg-white/30"
            onTouchStart={() => { gameState.current.p1.dirX = 0; gameState.current.p1.dirZ = -1; }}
            >↓</button>
        </div>
        <button 
          className="w-16 h-16 bg-white/10 rounded-full backdrop-blur border border-white/20 active:bg-white/30"
          onTouchStart={() => { gameState.current.p1.dirX = 1; gameState.current.p1.dirZ = 0; }}
        >→</button>
      </div>
    </div>
  );
}