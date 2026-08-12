/**
 * src/lib/logger.ts
 *
 * Centralised structured logger for the SMC app.
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.info('Job started', { studentId, queue });
 *   logger.warn('Rate limited', { api: 'chess.com', retryAfter: 30 });
 *   logger.error('API failed', { error: err.message, stack: err.stack });
 *
 * In production, every call writes a JSON line to logs/app.log.
 * In development, it also pretty-prints to the console.
 */

import * as fs from 'fs';
import * as path from 'path';

// ── Config ──────────────────────────────────────────────────────────────────

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB — rotate after this
const IS_DEV = process.env.NODE_ENV !== 'production';

// Ensure the log directory exists (safe to call multiple times)
if (typeof window === 'undefined') {
  try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch { /* already exists */ }
}

// ── Types ───────────────────────────────────────────────────────────────────

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  ts: string;          // ISO timestamp
  level: LogLevel;
  msg: string;
  [key: string]: unknown;
}

// ── ANSI colours for dev console ────────────────────────────────────────────

const COLOURS: Record<LogLevel, string> = {
  debug: '\x1b[90m',   // grey
  info:  '\x1b[36m',   // cyan
  warn:  '\x1b[33m',   // yellow
  error: '\x1b[31m',   // red
};
const RESET = '\x1b[0m';

// ── Core write ──────────────────────────────────────────────────────────────

function write(level: LogLevel, msg: string, meta?: Record<string, unknown>) {
  // Skip debug logs in production
  if (level === 'debug' && !IS_DEV) return;

  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...meta,
  };

  const line = JSON.stringify(entry);

  // ── Write to file (server-side only) ──────────────────────────────────────
  if (typeof window === 'undefined') {
    try {
      // Rotate if file is too large
      try {
        const stat = fs.statSync(LOG_FILE);
        if (stat.size > MAX_FILE_BYTES) {
          fs.renameSync(LOG_FILE, LOG_FILE.replace('.log', `.${Date.now()}.log`));
        }
      } catch { /* file doesn't exist yet */ }

      fs.appendFileSync(LOG_FILE, line + '\n');
    } catch { /* silently ignore write errors — logging must never crash the app */ }
  }

  // ── Console output ────────────────────────────────────────────────────────
  if (IS_DEV) {
    const colour = COLOURS[level];
    const prefix = `${colour}[${level.toUpperCase().padEnd(5)}]${RESET}`;
    const metaStr = meta && Object.keys(meta).length > 0
      ? ' ' + JSON.stringify(meta)
      : '';
    console.log(`${prefix} ${entry.ts}  ${msg}${metaStr}`);
  } else {
    // In production, just write structured JSON to stdout as well (picked up by Railway logs)
    if (level === 'error' || level === 'warn') {
      process.stderr.write(line + '\n');
    } else {
      process.stdout.write(line + '\n');
    }
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => write('debug', msg, meta),
  info:  (msg: string, meta?: Record<string, unknown>) => write('info',  msg, meta),
  warn:  (msg: string, meta?: Record<string, unknown>) => write('warn',  msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => write('error', msg, meta),

  /**
   * Log the start of a job.
   * @example logger.job.start('chess-fetch', { studentId, queue: 'chess-fetch-queue' })
   */
  job: {
    start:    (name: string, meta?: Record<string, unknown>) => write('info',  `[JOB START]  ${name}`, meta),
    success:  (name: string, meta?: Record<string, unknown>) => write('info',  `[JOB DONE]   ${name}`, meta),
    warn:     (name: string, meta?: Record<string, unknown>) => write('warn',  `[JOB WARN]   ${name}`, meta),
    fail:     (name: string, meta?: Record<string, unknown>) => write('error', `[JOB FAILED] ${name}`, meta),
    skip:     (name: string, meta?: Record<string, unknown>) => write('debug', `[JOB SKIP]   ${name}`, meta),
  },
};
