'use client';

import { useSyncExternalStore } from 'react';

// Hydration guard: returns false during SSR and initial hydration, true on client
const emptySubscribe = () => () => {};

export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true, // client snapshot
    () => false // server snapshot
  );
}
