/**
 * Encodes a search result into a shareable URL.
 * All data is in the URL — no backend needed.
 * Format: /share?d={base64(json)}
 */

export interface ShareWinner {
  title: string;
  price: number;
  source: string;
  link: string;
  score: number;
  justification?: string;
  rating?: number;
  review_count?: number;
}

export interface ShareData {
  query: string;
  winner: ShareWinner;
  total_compared: number;
  timestamp: string;
}

/**
 * Universal base64 encoder supporting full UTF-8 across browser and Node.js SSR
 */
export function safeUtf8ToBase64(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'utf-8').toString('base64');
  }
  if (typeof btoa !== 'undefined') {
    // encodeURIComponent + unescape ensures multi-byte UTF-8 does not throw InvalidCharacterError
    return btoa(unescape(encodeURIComponent(str)));
  }
  return '';
}

/**
 * Universal base64 decoder supporting full UTF-8 across browser and Node.js SSR
 */
export function safeBase64ToUtf8(base64Str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(base64Str, 'base64').toString('utf-8');
  }
  if (typeof atob !== 'undefined') {
    return decodeURIComponent(escape(atob(base64Str)));
  }
  return '';
}

export function encodeShareData(data: ShareData): string {
  try {
    const json = JSON.stringify(data);
    return safeUtf8ToBase64(json);
  } catch {
    return '';
  }
}

export function decodeShareData(encoded: string): ShareData | null {
  if (!encoded || typeof encoded !== 'string') {
    return null;
  }
  try {
    // Handle URL-encoded base64 if present
    const normalized = encoded.includes('%') ? decodeURIComponent(encoded) : encoded;
    const json = safeBase64ToUtf8(normalized);
    if (!json) return null;
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === 'object' && typeof parsed.query === 'string' && parsed.winner) {
      return parsed as ShareData;
    }
    return null;
  } catch {
    return null;
  }
}

export function buildShareUrl(data: ShareData): string {
  const encoded = encodeShareData(data);
  const base =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'http://localhost:3000';
  return `${base}/share?d=${encodeURIComponent(encoded)}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
