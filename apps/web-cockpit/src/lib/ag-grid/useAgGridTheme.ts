'use client';

import { useMemo, useState } from 'react';
import { themeQuartz } from 'ag-grid-community';
import { useTheme } from '@/components/ThemeProvider';

export type GridDensity = 'comfortable' | 'compact' | 'dense';

export interface AgGridThemeOptions {
  density?: GridDensity;
}

export function getAgGridTheme(mode: 'dark' | 'light' = 'dark', density: GridDensity = 'comfortable') {
  const isDark = mode === 'dark';

  const spacingMap: Record<GridDensity, number> = {
    comfortable: 8,
    compact: 6,
    dense: 4,
  };

  const spacing = spacingMap[density] ?? 8;

  return themeQuartz.withParams({
    fontFamily: 'var(--pp-font, var(--font-inter, sans-serif))',
    accentColor: isDark ? '#06b6d4' : '#0070e0',
    backgroundColor: isDark ? '#0b1324' : '#ffffff',
    foregroundColor: isDark ? '#f8fafc' : '#001435',
    borderColor: isDark ? '#1e293b' : '#e2e8f0',
    rowHoverColor: isDark ? '#131f37' : '#f1f5f9',
    headerBackgroundColor: isDark ? '#080d1a' : '#f8fafc',
    headerTextColor: isDark ? '#94a3b8' : '#475569',
    headerFontWeight: 700,
    selectedRowBackgroundColor: isDark ? '#0c2b4e' : '#e0f2fe',
    spacing,
  });
}

export function useAgGridTheme(options?: AgGridThemeOptions) {
  let mode: 'dark' | 'light' = 'dark';
  try {
    const themeContext = useTheme();
    mode = themeContext.resolvedTheme === 'light' ? 'light' : 'dark';
  } catch {
    // If used outside ThemeProvider (e.g. isolated test)
    mode = 'dark';
  }

  const [density, setDensity] = useState<GridDensity>(options?.density || 'comfortable');

  const theme = useMemo(() => {
    return getAgGridTheme(mode, density);
  }, [mode, density]);

  return {
    theme,
    mode,
    density,
    setDensity,
  };
}
