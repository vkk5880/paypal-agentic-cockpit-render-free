/**
 * AegisPay Unified Enterprise Observability & Debug Logging Subsystem
 *
 * Provides structured, colorized, timestamped logging across all monorepo tiers:
 * - apps/api-orchestrator (Fastify, routes, services)
 * - packages/mcp-enforcer (strictly writes to stderr to preserve stdio JSON-RPC protocol)
 * - apps/workflows (Render Workflows tasks, steps, durable checkpoints)
 * - apps/web-cockpit (Next.js server API routes & browser dev mode)
 * - packages/database (PostgreSQL & SQLite query observability)
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

export interface LoggerOptions {
  stream?: 'stdout' | 'stderr' | 'auto';
  minLevel?: LogLevel;
  prefix?: string;
}

const LEVEL_SEVERITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

const SENSITIVE_KEY_REGEX =
  /^(authorization|cookie|secret|client[-_]?secret|.*[-_]?token$|^token$|access[-_]?token|refresh[-_]?token|session[-_]?token|id[-_]?token|vault[-_]?token|bearer|password|passwd|pwd|cvv|cvc|pin|ssn|card[-_]?number|ed25519_signature_hex|public_key_hex|api[-_]?key|private[-_]?key|credential|spt)$/i;

/**
 * Recursively redacts sensitive credentials from logged objects and prevents circular reference errors.
 */
export function sanitizeForLogging(obj: any, maxDepth = 4, seen = new WeakSet()): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (seen.has(obj)) {
    return '[Circular Reference]';
  }
  if (maxDepth <= 0) {
    return '[Max Depth Exceeded]';
  }

  seen.add(obj);

  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: obj.message,
      stack: obj.stack,
      ...(obj as any),
    };
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForLogging(item, maxDepth - 1, seen));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (SENSITIVE_KEY_REGEX.test(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof val === 'string' && val.length > 500) {
      // Truncate overly long strings like base64 payloads to keep logs readable
      sanitized[key] = `${val.slice(0, 100)}... [truncated ${val.length - 100} chars]`;
    } else {
      sanitized[key] = sanitizeForLogging(val, maxDepth - 1, seen);
    }
  }

  return sanitized;
}

/**
 * Resolves active log level based on environment variables and runtime context.
 */
export function resolveLogLevel(optionsLevel?: LogLevel): LogLevel {
  if (optionsLevel) return optionsLevel;

  // Browser environment check
  if (typeof window !== 'undefined') {
    try {
      if (
        (window as any).__AEGISPAY_DEBUG__ === true ||
        window.localStorage?.getItem('aegispay_dev_mode') === 'true'
      ) {
        return 'debug';
      }
    } catch {
      // Ignore security errors in sandboxed iframes
    }
  }

  // Node environment check
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.DEBUG === 'true' || process.env.DEBUG === '1' || process.env.DEBUG === '*') {
      return 'debug';
    }
    const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined;
    if (envLevel && envLevel in LEVEL_SEVERITY) {
      return envLevel;
    }
    // In development or test environments, default to debug for complete visibility
    if (process.env.NODE_ENV !== 'production') {
      return 'debug';
    }
  }

  return 'info';
}

export interface Logger {
  readonly namespace: string;
  readonly minLevel: LogLevel;
  debug(message: string, ...meta: any[]): void;
  info(message: string, ...meta: any[]): void;
  warn(message: string, ...meta: any[]): void;
  error(message: string, ...meta: any[]): void;
  time(label: string): (extraMsg?: string, ...meta: any[]) => number;
  child(subNamespace: string, childOptions?: LoggerOptions): Logger;
}

class AegisLogger implements Logger {
  readonly namespace: string;
  readonly minLevel: LogLevel;
  private readonly streamMode: 'stdout' | 'stderr' | 'auto';
  private readonly isTerminal: boolean;

  constructor(namespace: string, options: LoggerOptions = {}) {
    this.namespace = namespace;
    this.minLevel = resolveLogLevel(options.minLevel);
    this.streamMode = options.stream ?? 'auto';
    this.isTerminal =
      typeof process !== 'undefined' &&
      Boolean(process.stdout?.isTTY) &&
      !Boolean(process.env.NO_COLOR);
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_SEVERITY[level] >= LEVEL_SEVERITY[this.minLevel];
  }

  private getFormattedPrefix(level: LogLevel): string {
    const timestamp = new Date().toISOString();
    const upperLevel = level.toUpperCase().padEnd(5);

    if (!this.isTerminal) {
      return `${timestamp} [${upperLevel}] [${this.namespace}]`;
    }

    // ANSI Colors for terminal output
    const colors: Record<string, string> = {
      reset: '\x1b[0m',
      dim: '\x1b[2m',
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m', // Green
      warn: '\x1b[33m', // Yellow
      error: '\x1b[31m', // Red
      ns: '\x1b[35m\x1b[1m', // Magenta bold
    };

    const color = colors[level] || colors.reset;
    return `${colors.dim}${timestamp}${colors.reset} ${color}[${upperLevel}]${colors.reset} ${colors.ns}[${this.namespace}]${colors.reset}`;
  }

  private write(level: LogLevel, message: string, meta: any[]): void {
    if (!this.shouldLog(level)) return;

    const prefix = this.getFormattedPrefix(level);
    const sanitizedMeta = meta.map((m) => sanitizeForLogging(m));

    // Handle browser console with styled outputs
    if (typeof window !== 'undefined' && console) {
      const styles = {
        debug: 'color: #06b6d4; font-weight: bold;',
        info: 'color: #10b981; font-weight: bold;',
        warn: 'color: #f59e0b; font-weight: bold;',
        error: 'color: #ef4444; font-weight: bold;',
      };
      const style = styles[level as keyof typeof styles] || '';
      const method = level === 'debug' ? 'debug' : level === 'info' ? 'info' : level === 'warn' ? 'warn' : 'error';
      if (sanitizedMeta.length > 0) {
        console[method](`%c[${this.namespace}] ${message}`, style, ...sanitizedMeta);
      } else {
        console[method](`%c[${this.namespace}] ${message}`, style);
      }
      return;
    }

    // Node.js environment
    const useStderr =
      this.streamMode === 'stderr' ||
      (this.streamMode === 'auto' && (level === 'warn' || level === 'error'));

    const outputTarget = useStderr ? console.error : console.log;

    if (sanitizedMeta.length > 0) {
      outputTarget(`${prefix} ${message}`, ...sanitizedMeta);
    } else {
      outputTarget(`${prefix} ${message}`);
    }
  }

  debug(message: string, ...meta: any[]): void {
    this.write('debug', message, meta);
  }

  info(message: string, ...meta: any[]): void {
    this.write('info', message, meta);
  }

  warn(message: string, ...meta: any[]): void {
    this.write('warn', message, meta);
  }

  error(message: string, ...meta: any[]): void {
    this.write('error', message, meta);
  }

  time(label: string): (extraMsg?: string, ...meta: any[]) => number {
    const start = Date.now();
    this.debug(`⏱️ Started timer: ${label}`);
    return (extraMsg?: string, ...meta: any[]) => {
      const elapsed = Date.now() - start;
      const msg = extraMsg ? `${label} (${elapsed}ms) - ${extraMsg}` : `${label} completed in ${elapsed}ms`;
      this.info(`⏱️ ${msg}`, ...meta);
      return elapsed;
    };
  }

  child(subNamespace: string, childOptions: LoggerOptions = {}): Logger {
    return new AegisLogger(`${this.namespace}:${subNamespace}`, {
      stream: childOptions.stream ?? this.streamMode,
      minLevel: childOptions.minLevel ?? this.minLevel,
    });
  }
}

/**
 * Factory function creating a named Logger instance.
 */
export function createLogger(namespace: string, options: LoggerOptions = {}): Logger {
  return new AegisLogger(namespace, options);
}
