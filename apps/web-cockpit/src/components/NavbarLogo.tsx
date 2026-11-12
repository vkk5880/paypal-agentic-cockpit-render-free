'use client';

import React, { useState } from 'react';
import { Shield } from 'lucide-react';

export default function NavbarLogo() {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative w-10 h-10 flex items-center justify-center cursor-pointer select-none group"
    >
      {/* Outer ambient glow */}
      <div
        className={`absolute inset-0 rounded-2xl bg-cyan-500/20 blur-md transition-all duration-500 ${
          hovered ? 'scale-125 bg-cyan-400/30' : 'scale-100'
        }`}
      />

      {/* SVG 3D Orbital Rings */}
      <svg
        viewBox="0 0 100 100"
        className={`absolute inset-0 w-full h-full pointer-events-none transition-transform duration-700 ${
          hovered ? 'rotate-180 scale-110' : 'rotate-0'
        }`}
      >
        <defs>
          <linearGradient id="ringGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="ringGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Outer Ring */}
        <ellipse
          cx="50"
          cy="50"
          rx="44"
          ry="18"
          fill="none"
          stroke="url(#ringGrad1)"
          strokeWidth="2.5"
          transform="rotate(30 50 50)"
          strokeDasharray="8 4"
          className="animate-spin-slow origin-center"
        />

        {/* Counter Ring */}
        <ellipse
          cx="50"
          cy="50"
          rx="40"
          ry="15"
          fill="none"
          stroke="url(#ringGrad2)"
          strokeWidth="2"
          transform="rotate(-40 50 50)"
          strokeDasharray="6 3"
        />
      </svg>

      {/* Core Gradient Icon Shield */}
      <div
        className={`relative z-10 w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 transition-transform duration-300 ${
          hovered ? 'scale-110 rotate-3' : 'scale-100'
        }`}
      >
        <Shield className="w-4 h-4 text-white drop-shadow" />
      </div>
    </div>
  );
}
