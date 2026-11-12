'use client';

import { useState, useCallback } from 'react';

export type CursorVariant = 'default' | 'magnetic' | 'hover' | 'search';

let _variant: CursorVariant = 'default';

export interface GlobalState {
  cursorVariant: CursorVariant;
  isLowEnd: boolean;
  setCursorVariant: (variant: CursorVariant) => void;
}

export function useGlobalState(): GlobalState {
  const [cursorVariant, setCursorVariantState] = useState<CursorVariant>(_variant);
  const [isLowEnd] = useState(() =>
    typeof navigator !== 'undefined' && navigator.hardwareConcurrency != null
      ? navigator.hardwareConcurrency <= 4
      : false
  );

  const setCursorVariant = useCallback((v: CursorVariant) => {
    _variant = v;
    setCursorVariantState(v);
  }, []);

  return { cursorVariant, isLowEnd, setCursorVariant };
}
