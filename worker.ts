/**
 * BullMQ Worker Entry Point
 *
 * This file is the persistent process that picks up background jobs.
 * It is NOT part of the Next.js server — it runs as a separate service.
 *
 * Local dev:  npm run worker
 * Railway:    Set start command to "npm run worker" on the Worker service.
 *
 * @next/env is used to load .env variables before any module is imported,
 * because Node.js hoists static imports before synchronous code runs.
 * Dynamic import() is used to guarantee env vars are set first.
 */
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

import('./src/jobs/batch.worker')
  .then(() => {
    console.log('[Worker] BullMQ worker started. Listening for jobs on batch-queue...');
  })
  .catch((err: Error) => {
    console.error('[Worker] Failed to start:', err.message);
    process.exit(1);
  });
