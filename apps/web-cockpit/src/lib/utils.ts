import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatCents(cents: number): string {
  if (typeof cents !== 'number' || isNaN(cents)) {
    return '$0.00';
  }
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Resolves API URL safely, ensuring bare hostnames (e.g. from Render property: host)
 * are prefixed with https:// so browser fetch() does not treat them as relative paths.
 * In browser context, returns empty string (relative same-origin) unless NEXT_PUBLIC_API_URL
 * is explicitly configured, ensuring full CSP (connect-src 'self') compliance.
 * On server-side, prioritizes internal network env vars (API_URL, INTERNAL_API_URL).
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const pub = process.env.NEXT_PUBLIC_API_URL;
    if (!pub) return '';
    if (pub.startsWith('http://') || pub.startsWith('https://')) {
      return pub.replace(/\/+$/, '');
    }
    return `https://${pub}`.replace(/\/+$/, '');
  }

  const raw = process.env.API_URL || process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || '';
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw.replace(/\/+$/, '');
  }
  return `https://${raw}`.replace(/\/+$/, '');
}
