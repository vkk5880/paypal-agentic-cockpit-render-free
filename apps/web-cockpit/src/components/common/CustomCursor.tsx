'use client';

import React, { useEffect, useState } from 'react';

export function CustomCursor() {
  const [dotPos, setDotPos] = useState<{ x: number; y: number }>({ x: -100, y: -100 });
  const [ringPos, setRingPos] = useState<{ x: number; y: number }>({ x: -100, y: -100 });
  const [clicking, setClicking] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [isTouch, setIsTouch] = useState(true);

  useEffect(() => {
    // Check for SSR and touch / mobile device
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(pointer: coarse)').matches) {
      return;
    }

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionQuery.matches) {
      return;
    }
    setIsTouch(false);

    let rafId: number | null = null;
    let targetX = -100;
    let targetY = -100;
    let ringX = -100;
    let ringY = -100;

    const onMouseMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      setDotPos({ x: targetX, y: targetY });

      const target = e.target as HTMLElement | null;
      setHovering(!!target?.closest('button, a, input, select, textarea, [role="button"]'));
    };

    const onMouseDown = () => setClicking(true);
    const onMouseUp = () => setClicking(false);

    const updateRing = () => {
      ringX += (targetX - ringX) * 0.22;
      ringY += (targetY - ringY) * 0.22;
      setRingPos({ x: ringX, y: ringY });
      rafId = requestAnimationFrame(updateRing);
    };

    const handleMotionChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        setIsTouch(true);
      } else {
        setIsTouch(false);
        if (rafId === null) {
          rafId = requestAnimationFrame(updateRing);
        }
      }
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    motionQuery.addEventListener?.('change', handleMotionChange);
    rafId = requestAnimationFrame(updateRing);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      motionQuery.removeEventListener?.('change', handleMotionChange);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  if (isTouch) return null;

  return (
    <div
      className="hidden md:block pointer-events-none fixed inset-0 z-[9999] overflow-hidden"
      aria-hidden="true"
      tabIndex={-1}
    >
      {/* High-Precision Core Dot */}
      <div
        className="fixed rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] transition-transform duration-75 ease-out"
        style={{
          left: `${dotPos.x}px`,
          top: `${dotPos.y}px`,
          width: '7px',
          height: '7px',
          transform: `translate(-50%, -50%) scale(${clicking ? 0.7 : hovering ? 0 : 1})`,
        }}
      />

      {/* Trailing Soft Halo Ring */}
      <div
        className="fixed rounded-full border border-cyan-400/70 transition-all duration-150 ease-out"
        style={{
          left: `${ringPos.x}px`,
          top: `${ringPos.y}px`,
          width: hovering ? '42px' : '26px',
          height: hovering ? '42px' : '26px',
          transform: `translate(-50%, -50%) scale(${clicking ? 0.85 : 1})`,
          backgroundColor: hovering ? 'rgba(6,182,212,0.12)' : 'transparent',
          borderColor: hovering ? 'rgba(6,182,212,0.9)' : 'rgba(6,182,212,0.5)',
        }}
      />
    </div>
  );
}
