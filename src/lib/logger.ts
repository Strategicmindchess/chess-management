/**
 * src/lib/logger.ts
 *
 * Centralised structured logger for the SMC app using Pino.
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.info({ studentId, queue }, 'Job started');
 *   logger.warn({ api: 'chess.com', retryAfter: 30 }, 'Rate limited');
 *   logger.error({ error: err.message, stack: err.stack }, 'API failed');
 */

import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

const pinoLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // Include ISO timestamp
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label: string) => {
      return { level: label };
    },
  },
  // Use pino-pretty in development for readable logs
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'SYS:standard',
          },
        },
      }),
});

// ── Public API ───────────────────────────────────────────────────────────────

export const logger = {
  debug: (metaOrMsg: Record<string, unknown> | string, msg?: string) => {
    if (typeof metaOrMsg === 'string') {
      pinoLogger.debug(metaOrMsg);
    } else {
      pinoLogger.debug(metaOrMsg, msg);
    }
  },
  info: (metaOrMsg: Record<string, unknown> | string, msg?: string) => {
    if (typeof metaOrMsg === 'string') {
      pinoLogger.info(metaOrMsg);
    } else {
      pinoLogger.info(metaOrMsg, msg);
    }
  },
  warn: (metaOrMsg: Record<string, unknown> | string, msg?: string) => {
    if (typeof metaOrMsg === 'string') {
      pinoLogger.warn(metaOrMsg);
    } else {
      pinoLogger.warn(metaOrMsg, msg);
    }
  },
  error: (metaOrMsg: Record<string, unknown> | string, msg?: string) => {
    if (typeof metaOrMsg === 'string') {
      pinoLogger.error(metaOrMsg);
    } else {
      pinoLogger.error(metaOrMsg, msg);
    }
  },

  /**
   * Log the start of a job.
   * Preserved for backward compatibility with existing codebase.
   */
  job: {
    start: (name: string, meta?: Record<string, unknown>) => pinoLogger.info(meta || {}, `[JOB START]  ${name}`),
    success: (name: string, meta?: Record<string, unknown>) => pinoLogger.info(meta || {}, `[JOB DONE]   ${name}`),
    warn: (name: string, meta?: Record<string, unknown>) => pinoLogger.warn(meta || {}, `[JOB WARN]   ${name}`),
    fail: (name: string, meta?: Record<string, unknown>) => pinoLogger.error(meta || {}, `[JOB FAILED] ${name}`),
    skip: (name: string, meta?: Record<string, unknown>) => pinoLogger.debug(meta || {}, `[JOB SKIP]   ${name}`),
  },
};

