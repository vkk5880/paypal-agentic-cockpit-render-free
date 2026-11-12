'use client';

import React, { useEffect, useRef, useState } from 'react';

export interface CursorGlowProps {
  size?: number;
  color?: string;
  className?: string;
}

export function CursorGlow({
  size = 420,
  color = 'rgba(6, 182, 212, 0.12)', // Cyan neon glow
  className = '',
}: CursorGlowProps) {
  const glowRef = useRef<HTMLDivElement | null>(null);
  const [isTouch, setIsTouch] = useState(true);

  useEffect(() => {
    // Disable on mobile/touch screens to avoid unnecessary work
    if (window.matchMedia('(pointer: coarse)').matches) {
      return;
    }
    setIsTouch(false);

    let rafId: number;
    let targetX = -500;
    let targetY = -500;
    let currentX = -500;
    let currentY = -500;
    let hasMoved = false;

    const onMouseMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      if (!hasMoved) {
        currentX = targetX;
        currentY = targetY;
        hasMoved = true;
      }
    };

    const updatePosition = () => {
      // Spring lerp factor (smooth lag behind cursor)
      const factor = 0.14;
      currentX += (targetX - currentX) * factor;
      currentY += (targetY - currentY) * factor;

      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${currentX - size / 2}px, ${
          currentY - size / 2
        }px, 0)`;
      }

      rafId = requestAnimationFrame(updatePosition);
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    rafId = requestAnimationFrame(updatePosition);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, [size]);

  if (isTouch) return null;

  return (
    <div
      ref={glowRef}
      aria-hidden="true"
      className={`pointer-events-none fixed top-0 left-0 rounded-full blur-[110px] z-0 mix-blend-screen transition-opacity duration-300 will-change-transform ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        background: color,
        transform: 'translate3d(-500px, -500px, 0)',
      }}
    />
  );
}
