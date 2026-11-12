'use client';

import React, { useRef, useEffect } from 'react';

export interface PerspectiveWrapperProps {
  children: React.ReactNode;
  active?: boolean;
  className?: string;
  maxTiltDegrees?: number;
}

export function PerspectiveWrapper({
  children,
  active = true,
  className = '',
  maxTiltDegrees = 4,
}: PerspectiveWrapperProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!active) return;
    if (typeof window === 'undefined') return;

    // Skip tilt calculations on touch/coarse devices
    if (window.matchMedia('(pointer: coarse)').matches) {
      return;
    }

    let rafId: number;
    let targetRotX = 0;
    let targetRotY = 0;
    let currentRotX = 0;
    let currentRotY = 0;

    const onMouseMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;

      targetRotY = nx * maxTiltDegrees;
      targetRotX = -ny * maxTiltDegrees;
    };

    const updateTilt = () => {
      // Spring interpolation
      const factor = 0.08;
      currentRotX += (targetRotX - currentRotX) * factor;
      currentRotY += (targetRotY - currentRotY) * factor;

      if (innerRef.current) {
        innerRef.current.style.transform = `rotateX(${currentRotX.toFixed(
          3
        )}deg) rotateY(${currentRotY.toFixed(3)}deg)`;
      }

      rafId = requestAnimationFrame(updateTilt);
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    rafId = requestAnimationFrame(updateTilt);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, [active, maxTiltDegrees]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden ${className}`}
      style={{ perspective: '2000px' }}
    >
      <div
        ref={innerRef}
        className="w-full h-full origin-center relative will-change-transform"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {children}
      </div>
    </div>
  );
}
