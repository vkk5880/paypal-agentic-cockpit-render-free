'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

export interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ children, className = '' }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <div
      key={pathname}
      className={`flex-1 flex flex-col w-full animate-fade-in-up transition-opacity duration-300 ${className}`}
    >
      {children}
    </div>
  );
}
