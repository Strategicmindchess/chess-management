import { NextRequest, NextResponse } from 'next/server';
import { logger } from './logger';

type RouteHandler = (
  req: NextRequest,
  context: any
) => Promise<NextResponse | Response> | NextResponse | Response;

/** Convert bytes → rounded MB string */
function mb(bytes: number) {
  return (bytes / 1024 / 1024).toFixed(1);
}

/** Snapshot rss + heapUsed + heapTotal + external in MB */
function memSnap(label: string) {
  const m = process.memoryUsage();
  return {
    [`${label}_rss`]:      mb(m.rss),
    [`${label}_heap`]:     mb(m.heapUsed),
    [`${label}_heapTotal`]:mb(m.heapTotal),
    [`${label}_ext`]:      mb(m.external),
  };
}

/**
 * Wraps a Next.js API route handler to log request context,
 * including duration, status code, and memory before/after.
 *
 * Usage:
 * export const GET = withLogging(async (req) => { ... });
 */
export function withLogging(handler: RouteHandler): RouteHandler {
  return async (req: NextRequest, context: any) => {
    const start = Date.now();
    const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
    const method = req.method;
    let route = req.nextUrl?.pathname || req.url;

    const before = memSnap('before');

    try {
      const response = await handler(req, context);
      const durationMs = Date.now() - start;
      const after = memSnap('after');

      const heapDeltaMB = (
        parseFloat(after.after_heap) - parseFloat(before.before_heap)
      ).toFixed(1);

      let payloadSizeKB = '0.00';
      let payloadSizeMB = '0.00';
      let bytes = 0;

      if (response) {
        const contentLength = response.headers?.get('content-length');
        if (contentLength) {
          bytes = parseInt(contentLength, 10);
        } else if (typeof response.clone === 'function') {
          try {
            const resClone = response.clone();
            const buffer = await resClone.arrayBuffer();
            bytes = buffer.byteLength;
          } catch (e) {
            // ignore if stream cannot be cloned or read
          }
        }
        if (!isNaN(bytes)) {
          payloadSizeKB = (bytes / 1024).toFixed(2);
          payloadSizeMB = (bytes / 1024 / 1024).toFixed(3);
        }
      }

      logger.info(
        {
          requestId,
          method,
          route,
          statusCode: response.status,
          durationMs,
          payloadSize: `${payloadSizeKB} KB (${payloadSizeMB} MB)`,
          mem: {
            before_rss:  before.before_rss,
            before_heap: before.before_heap,
            after_rss:   after.after_rss,
            after_heap:  after.after_heap,
            heapDeltaMB: `${heapDeltaMB} MB`,
          },
        },
        'Request completed'
      );

      return response;
    } catch (error: any) {
      const durationMs = Date.now() - start;
      const statusCode = error?.status || error?.statusCode || 500;
      const after = memSnap('after');

      logger.error(
        {
          requestId,
          method,
          route,
          statusCode,
          durationMs,
          error: error?.message || 'Unknown error',
          mem: {
            before_heap: before.before_heap,
            after_heap:  after.after_heap,
          },
        },
        'Request failed'
      );

      throw error;
    }
  };
}

