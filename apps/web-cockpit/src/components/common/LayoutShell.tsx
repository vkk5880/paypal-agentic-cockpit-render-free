'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { CustomCursor } from '@/components/common/CustomCursor';
import { CursorEnergy } from '@/components/common/CursorEnergy';
import { PageTransition } from '@/components/common/PageTransition';

export interface LayoutShellProps {
  children: React.ReactNode;
}

/**
 * LayoutShell — isolates route transitions and conditionally mounts ambient cursor layers.
 * On /share routes or in production (when NEXT_PUBLIC_DEMO_MODE is not true),
 * heavy cursor layers are bypassed to preserve the native OS cursor and avoid input lag.
 */
export function LayoutShell({ children }: LayoutShellProps) {
  const pathname = usePathname();
  const isShare = pathname?.startsWith('/share');
  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  return (
    <>
      {!isShare && isDemo && (
        <>
          <CustomCursor />
          <CursorEnergy />
        </>
      )}
      <PageTransition>{children}</PageTransition>
    </>
  );
}
