"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Zap, AlertTriangle } from "lucide-react";

interface CyberRacerProps {
  onGameOver: (score: number) => void;
}

export default function CyberRacer({ onGameOver }: CyberRacerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(0);
  
  // Game State
  const gameState = useRef({
    pos: 0,
    playerX: 0,
    speed: 0,
    maxSpeed: 12000, // scaled speed
    segments: [] as any[],
    segmentLength: 200,
    rumbleLength: 3,
    roadWidth: 2000,
    running: true,
    cars: [] as any[],
    lastTime: 0
  });

  // Generate Road
  useEffect(() => {
    const segments = [];
    const totalSegments = 500; // Track length
    for (let i = 0; i < totalSegments; i++) {
      // Add curves
      const curve = Math.floor(i / 50) % 2 === 0 ? 0 : (Math.floor(i / 100) % 2 === 0 ? 2 : -2);
      const y = Math.sin(i / 30) * 1000; // Hills
      
      segments.push({
        index: i,
        p1: { world: { x: 0, y: y, z: i * 200 }, camera: {}, screen: {} },
        p2: { world: { x: 0, y: y, z: (i + 1) * 200 }, camera: {}, screen: {} },
        curve: curve,
        color: Math.floor(i / 3) % 2 ? { road: '#1a1a1a', grass: '#000', rumble: '#fff' } : { road: '#111', grass: '#050505', rumble: '#ff0055' },
        cars: []
      });
    }
    gameState.current.segments = segments;
    
    // Add Traffic
    for (let i = 0; i < 20; i++) {
      const segmentIndex = Math.floor(Math.random() * (totalSegments - 50)) + 50;
      gameState.current.cars.push({
        z: segmentIndex * 200,
        x: (Math.random() * 0.8 - 0.4) * 3000, // Random lane
        speed: 5000 + Math.random() * 5000,
        color: Math.random() > 0.5 ? '#00ffff' : '#ffff00'
      });
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Resize
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    // Controls
    const keys = { left: false, right: false, up: false, down: false };
    const handleKey = (e: KeyboardEvent, down: boolean) => {
      if (e.key === 'ArrowLeft') keys.left = down;
      if (e.key === 'ArrowRight') keys.right = down;
      if (e.key === 'ArrowUp') keys.up = down;
      if (e.key === 'ArrowDown') keys.down = down;
    };
    window.addEventListener('keydown', (e) => handleKey(e, true));
    window.addEventListener('keyup', (e) => handleKey(e, false));

    // Touch Controls
    let touchX = 0;
    const handleTouch = (e: TouchEvent) => {
      e.preventDefault(); // Prevent scrolling
      const touch = e.touches[0];
      if (touch) {
        const center = window.innerWidth / 2;
        touchX = (touch.clientX - center) / center; // -1 to 1
        keys.up = true; // Auto accelerate on touch
      } else {
        keys.up = false;
        touchX = 0;
      }
    };
    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('touchmove', handleTouch);
    canvas.addEventListener('touchend', () => { keys.up = false; touchX = 0; });

    // Math Helpers
    const project = (p: any, cameraX: number, cameraY: number, cameraZ: number, cameraDepth: number, width: number, height: number, roadWidth: number) => {
      p.camera.x = (p.world.x || 0) - cameraX;
      p.camera.y = (p.world.y || 0) - cameraY;
      p.camera.z = (p.world.z || 0) - cameraZ;
      p.screen.scale = cameraDepth / p.camera.z;
      p.screen.x = Math.round((width / 2) + (p.screen.scale * p.camera.x * width / 2));
      p.screen.y = Math.round((height / 2) - (p.screen.scale * p.camera.y * height / 2));
      p.screen.w = Math.round((p.screen.scale * roadWidth * width / 2));
    };

    const renderPolygon = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number, color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x3, y3);
      ctx.lineTo(x4, y4);
      ctx.closePath();
      ctx.fill();
    };

    // Game Loop
    let animationId: number;
    const loop = (time: number) => {
      if (!gameState.current.running) return;
      
      const dt = Math.min(1, (time - gameState.current.lastTime) / 1000);
      gameState.current.lastTime = time;

      const state = gameState.current;
      const width = canvas.width;
      const height = canvas.height;

      // Update Physics
      const accel = state.maxSpeed / 5;
      const breaking = -state.maxSpeed;
      const decel = -state.maxSpeed / 5;
      const offRoadDecel = -state.maxSpeed / 2;
      const offRoadLimit = state.maxSpeed / 4;

      if (keys.up) state.speed = state.speed + accel * dt;
      else if (keys.down) state.speed = state.speed + breaking * dt;
      else state.speed = state.speed + decel * dt;

      // Steering
      let turn = 0;
      if (keys.left) turn = -1;
      else if (keys.right) turn = 1;
      else if (touchX !== 0) turn = touchX;

      state.playerX = state.playerX - (turn * state.speed * dt * 0.00015); // Turn speed depends on speed
      state.speed = Math.max(0, Math.min(state.speed, state.maxSpeed));
      state.pos = state.pos + state.speed * dt;

      // Loop Track
      const trackLength = state.segments.length * state.segmentLength;
      if (state.pos >= trackLength) state.pos -= trackLength;
      if (state.pos < 0) state.pos += trackLength;

      // Render
      ctx.fillStyle = '#000'; // Sky
      ctx.fillRect(0, 0, width, height);
      
      // Sun/Moon
      ctx.fillStyle = '#ff0055';
      ctx.beginPath();
      ctx.arc(width * 0.2, height * 0.2, 50, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 50;
      ctx.shadowColor = '#ff0055';
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw Road
      const startPos = Math.floor(state.pos / state.segmentLength);
      const cameraH = 1500 + (state.segments[startPos].p1.world.y || 0); // Follow hills
      const cameraD = 1 / Math.tan((80 * Math.PI / 180) / 2); // FOV 80
      const maxy = height;
      let x = 0;
      let dx = 0;

      // Draw Segments
      for (let n = startPos; n < startPos + 300; n++) {
        const segment = state.segments[n % state.segments.length];
        const looped = n >= state.segments.length;
        
        // Project
        project(segment.p1, (state.playerX * state.roadWidth) - x, cameraH, state.pos - (looped ? trackLength : 0), cameraD, width, height, state.roadWidth);
        project(segment.p2, (state.playerX * state.roadWidth) - x - dx, cameraH, state.pos - (looped ? trackLength : 0), cameraD, width, height, state.roadWidth);

        x += dx;
        dx += segment.curve;

        if (segment.p1.camera.z <= cameraD || segment.p2.screen.y >= maxy || segment.p2.screen.y >= segment.p1.screen.y) continue;

        renderPolygon(
          0, segment.p2.screen.y,
          width, segment.p2.screen.y,
          width, segment.p1.screen.y,
          0, segment.p1.screen.y,
          segment.color.grass
        );
        
        renderPolygon(
          segment.p1.screen.x, segment.p1.screen.y,
          segment.p1.screen.x + segment.p1.screen.w, segment.p1.screen.y,
          segment.p2.screen.x + segment.p2.screen.w, segment.p2.screen.y,
          segment.p2.screen.x, segment.p2.screen.y,
          segment.color.road
        );

        // Rumble strips
        const r1 = segment.p1.screen.w / 6;
        const r2 = segment.p2.screen.w / 6;
        renderPolygon(
          segment.p1.screen.x - r1, segment.p1.screen.y,
          segment.p1.screen.x, segment.p1.screen.y,
          segment.p2.screen.x, segment.p2.screen.y,
          segment.p2.screen.x - r2, segment.p2.screen.y,
          segment.color.rumble
        );
        renderPolygon(
          segment.p1.screen.x + segment.p1.screen.w, segment.p1.screen.y,
          segment.p1.screen.x + segment.p1.screen.w + r1, segment.p1.screen.y,
          segment.p2.screen.x + segment.p2.screen.w + r2, segment.p2.screen.y,
          segment.p2.screen.x + segment.p2.screen.w, segment.p2.screen.y,
          segment.color.rumble
        );
      }

      // Draw Player Car
      const carW = width * 0.15;
      const carH = carW * 0.5;
      const carX = width / 2 - carW / 2;
      const carY = height - carH - 20;

      // Car Body
      ctx.fillStyle = '#00ffff';
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#00ffff';
      ctx.fillRect(carX, carY, carW, carH);
      ctx.shadowBlur = 0;
      
      // Tail lights
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(carX + 10, carY + 10, 20, 10);
      ctx.fillRect(carX + carW - 30, carY + 10, 20, 10);

      // Update UI
      setSpeed(Math.floor(state.speed / 100));
      setScore(s => s + Math.floor(state.speed / 1000));

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <canvas ref={canvasRef} className="w-full h-full block" />
      
      {/* HUD */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
        <div className="bg-black/50 backdrop-blur p-4 rounded-xl border border-white/10">
          <div className="text-gray-400 text-xs uppercase">Score</div>
          <div className="text-neon-green font-mono text-2xl font-bold">{score}</div>
        </div>
        
        <div className="bg-black/50 backdrop-blur p-4 rounded-xl border border-white/10 text-right">
          <div className="text-gray-400 text-xs uppercase">Speed</div>
          <div className="text-neon-blue font-mono text-2xl font-bold">{speed} <span className="text-sm">km/h</span></div>
        </div>
      </div>

      {/* Mobile Hint */}
      <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none opacity-50">
        <p className="text-white text-sm animate-pulse">TOUCH & HOLD TO DRIVE • SLIDE TO STEER</p>
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