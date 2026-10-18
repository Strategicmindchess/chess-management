import { Worker } from 'bullmq';
import { connection } from './queue';
import { WhatsAppJobData } from './leaderboard.queues';
import { sendClassReminderService } from '@/services/whatsapp/class-reminder.service';
import { logger } from '@/lib/logger';
import { QUEUE_NAMES } from '@/lib/leaderboard-config';

import fs from 'fs';
import path from 'path';

function appendWorkerLog(level: string, msg: string, data?: Record<string, unknown>) {
  try {
    const logDir = path.resolve(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    const logPath = path.join(logDir, 'worker.log');
    const entry = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      msg,
      ...data,
    }) + '\n';
    fs.appendFileSync(logPath, entry, 'utf-8');
  } catch (e) {
    // ignore filesystem logging errors
  }
}

export const whatsappWorker = new Worker<WhatsAppJobData>(
  QUEUE_NAMES.WHATSAPP,
  async (job) => {
    const { type, refId, targetStudentIds } = job.data;
    logger.info({ jobId: job.id, type, refId }, '[WhatsAppWorker] Job received');
    appendWorkerLog('info', '[WhatsAppWorker] Job received', { jobId: job.id, type, refId });

    if (type === 'CLASS_REMINDER') {
      const result = await sendClassReminderService(
        refId,
        async (progress) => {
          await job.updateProgress(progress);
        },
        targetStudentIds
      );
      appendWorkerLog('info', '[WhatsAppWorker] Class reminder sent', { jobId: job.id, result });
      return result;
    }

    logger.info({ type }, '[WhatsAppWorker] Non-reminder job skipped (handled via manual communications)');
    appendWorkerLog('info', '[WhatsAppWorker] Non-reminder job skipped', { type });
    return { skipped: true, type };
  },
  { connection, concurrency: 2 }
);

whatsappWorker.on('completed', (job, result) => {
  logger.info({ jobId: job.id, result }, '[WhatsAppWorker] Job completed successfully');
  appendWorkerLog('info', '[WhatsAppWorker] Job completed successfully', { jobId: job.id, result });
});

whatsappWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err.message }, '[WhatsAppWorker] Job failed');
  appendWorkerLog('error', '[WhatsAppWorker] Job failed', { jobId: job?.id, error: err.message });
});

