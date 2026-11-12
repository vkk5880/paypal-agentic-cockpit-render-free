/**
 * Safe Origin and Callback URL Resolution
 *
 * Prevents ERR_ADDRESS_INVALID by ensuring unroutable IP addresses (e.g. 0.0.0.0)
 * are never passed to external OAuth/Vault providers (such as PayPal Sandbox)
 * as return_url or cancel_url.
 */

export interface NextRequestLike {
  nextUrl?: {
    origin?: string;
    protocol?: string;
    host?: string;
  };
  headers?: {
    get: (name: string) => string | null;
  };
}

/**
 * Sanitizes any raw origin or URL, replacing unroutable broadcast/meta addresses
 * like 0.0.0.0 with routable loopback hostnames (localhost) and returning the origin.
 */
export function sanitizeOrigin(originStr?: string | null): string {
  if (!originStr || typeof originStr !== 'string') {
    return 'http://localhost:3000';
  }

  try {
    const parsed = new URL(originStr);
    if (parsed.hostname === '0.0.0.0') {
      parsed.hostname = 'localhost';
    }
    return parsed.origin;
  } catch {
    return 'http://localhost:3000';
  }
}

/**
 * Sanitizes a complete callback URL, rewriting any 0.0.0.0 hostname to localhost
 * while preserving all paths, query parameters, and hashes.
 */
export function sanitizeCallbackUrl(urlStr?: string | null): string {
  if (!urlStr || typeof urlStr !== 'string') {
    return '';
  }

  try {
    const parsed = new URL(urlStr);
    if (parsed.hostname === '0.0.0.0') {
      parsed.hostname = 'localhost';
    }
    return parsed.toString();
  } catch {
    return urlStr;
  }
}

/**
 * Resolves the public, routable origin for the application across:
 * 1. Client-supplied origin (e.g. window.location.origin sent from browser)
 * 2. Canonical environment variables (APP_URL, NEXT_PUBLIC_APP_URL, RENDER_EXTERNAL_URL)
 * 3. Reverse-proxy headers (x-forwarded-host, x-forwarded-proto)
 * 4. NextRequest nextUrl.origin
 * 5. Fallback http://localhost:3000
 *
 * Guarantees that the returned origin never contains 0.0.0.0.
 */
export function resolvePublicOrigin(
  req?: NextRequestLike,
  bodyOrigin?: string
): string {
  // 1. Client-provided origin from browser
  if (bodyOrigin && typeof bodyOrigin === 'string' && bodyOrigin.trim().length > 0) {
    return sanitizeOrigin(bodyOrigin.trim());
  }

  // 2. Canonical Cloud / Render environment variables
  const envUrl =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.RENDER_EXTERNAL_URL;
  if (
    envUrl &&
    typeof envUrl === 'string' &&
    envUrl.trim().length > 0 &&
    envUrl !== 'undefined'
  ) {
    return sanitizeOrigin(envUrl.trim());
  }

  // 3. Reverse-proxy forwarded headers
  if (req?.headers) {
    const forwardedHost =
      req.headers.get('x-forwarded-host') || req.headers.get('host');
    if (forwardedHost) {
      const forwardedProto =
        req.headers.get('x-forwarded-proto') ||
        (req.nextUrl?.protocol ? req.nextUrl.protocol.replace(':', '') : 'http');
      return sanitizeOrigin(`${forwardedProto}://${forwardedHost}`);
    }
  }

  // 4. Request nextUrl origin fallback
  if (req?.nextUrl?.origin) {
    return sanitizeOrigin(req.nextUrl.origin);
  }

  // 5. Default local dev fallback
  return 'http://localhost:3000';
}

/**
 * Browser-safe origin getter.
 * Replaces 0.0.0.0 with localhost if accessed via the network bind IP.
 */
export function getClientOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return sanitizeOrigin(window.location.origin);
  }
  return 'http://localhost:3000';
}
