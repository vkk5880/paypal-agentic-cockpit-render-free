'use client';

import React, { useEffect, useRef, useState } from 'react';

interface Node {
  id: string;
  label: string;
  color: string;
  x: number;
  y: number;
  baseY: number;
  phase: number;
}

interface Particle {
  sourceIdx: number;
  targetIdx: number;
  progress: number;
  speed: number;
}

export function SwarmCanvas({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let isVisible = true;

    const nodes: Node[] = [
      { id: 'discover', label: '1. Discover (100M+ Catalog)', color: '#22d3ee', x: 0.18, y: 0.5, baseY: 0.5, phase: 0 },
      { id: 'score', label: '2. Score (0% Math Hallucination)', color: '#a855f7', x: 0.40, y: 0.38, baseY: 0.38, phase: 1.5 },
      { id: 'knapsack', label: '3. Knapsack (Rebate α=0.75)', color: '#fbbf24', x: 0.62, y: 0.62, baseY: 0.62, phase: 3.0 },
      { id: 'escrow', label: '4. Escrow Hold (PayPal 2PC)', color: '#34d399', x: 0.84, y: 0.5, baseY: 0.5, phase: 4.5 },
    ];

    const edges: [number, number][] = [
      [0, 1],
      [1, 2],
      [2, 3],
    ];

    const particles: Particle[] = [
      { sourceIdx: 0, targetIdx: 1, progress: 0.1, speed: 0.4 },
      { sourceIdx: 0, targetIdx: 1, progress: 0.6, speed: 0.45 },
      { sourceIdx: 1, targetIdx: 2, progress: 0.3, speed: 0.38 },
      { sourceIdx: 1, targetIdx: 2, progress: 0.8, speed: 0.42 },
      { sourceIdx: 2, targetIdx: 3, progress: 0.2, speed: 0.4 },
      { sourceIdx: 2, targetIdx: 3, progress: 0.7, speed: 0.46 },
    ];

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.parentElement?.clientWidth || window.innerWidth;
      const height = canvas.parentElement?.clientHeight || 400;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    const onVisibilityChange = () => {
      isVisible = !document.hidden;
      if (isVisible) {
        lastTime = performance.now();
        animationFrameId = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    let lastTime = performance.now();
    let time = 0;

    const render = (now: number) => {
      if (!isVisible) return;

      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      time += delta;

      const w = canvas.style.width ? parseFloat(canvas.style.width) : canvas.width;
      const h = canvas.style.height ? parseFloat(canvas.style.height) : canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Update node floating positions
      nodes.forEach((node) => {
        node.y = node.baseY * h + Math.sin(time * 1.6 + node.phase) * 16;
      });

      // Draw connecting edges with gradient beams
      edges.forEach(([sIdx, tIdx]) => {
        const s = nodes[sIdx];
        const t = nodes[tIdx];

        const sx = s.x * w;
        const sy = s.y;
        const tx = t.x * w;
        const ty = t.y;

        const grad = ctx.createLinearGradient(sx, sy, tx, ty);
        grad.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
        grad.addColorStop(0.5, 'rgba(168, 85, 247, 0.45)');
        grad.addColorStop(1, 'rgba(52, 211, 153, 0.35)');

        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.bezierCurveTo((sx + tx) / 2, sy - 20, (sx + tx) / 2, ty + 20, tx, ty);
        ctx.stroke();
      });

      // Draw traveling telemetry particles
      particles.forEach((p) => {
        p.progress += delta * p.speed;
        if (p.progress > 1) p.progress = 0;

        const s = nodes[p.sourceIdx];
        const t = nodes[p.targetIdx];
        const sx = s.x * w;
        const sy = s.y;
        const tx = t.x * w;
        const ty = t.y;

        // Cubic bezier interpolation
        const cx1 = (sx + tx) / 2;
        const cy1 = sy - 20;
        const cx2 = (sx + tx) / 2;
        const cy2 = ty + 20;

        const u = 1 - p.progress;
        const tt = p.progress * p.progress;
        const uu = u * u;
        const uuu = uu * u;
        const ttt = tt * p.progress;

        const px = uuu * sx + 3 * uu * p.progress * cx1 + 3 * u * tt * cx2 + ttt * tx;
        const py = uuu * sy + 3 * uu * p.progress * cy1 + 3 * u * tt * cy2 + ttt * ty;

        ctx.fillStyle = '#22d3ee';
        ctx.shadowColor = '#22d3ee';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Draw nodes
      nodes.forEach((node) => {
        const nx = node.x * w;
        const ny = node.y;

        // Outer pulse glow
        const glowRadius = 22 + Math.sin(time * 3 + node.phase) * 4;
        const nodeGlow = ctx.createRadialGradient(nx, ny, 4, nx, ny, glowRadius);
        nodeGlow.addColorStop(0, node.color);
        nodeGlow.addColorStop(0.5, 'rgba(6, 182, 212, 0.2)');
        nodeGlow.addColorStop(1, 'transparent');

        ctx.fillStyle = nodeGlow;
        ctx.beginPath();
        ctx.arc(nx, ny, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Node center core
        ctx.fillStyle = '#060b14';
        ctx.strokeStyle = node.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(nx, ny, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(nx, ny, 4, 0, Math.PI * 2);
        ctx.fill();

        // Node Label
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '600 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, nx, ny + 28);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      cancelAnimationFrame(animationFrameId);
    };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div
      aria-hidden="true"
      className={`relative w-full h-[360px] sm:h-[400px] overflow-hidden pointer-events-none select-none ${className}`}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
