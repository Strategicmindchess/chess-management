import { Worker } from 'bullmq';
import { connection } from './queue';
import { WhatsAppJobData } from './leaderboard.queues';
import { sendClassReminderService } from '@/services/whatsapp/class-reminder.service';
import { logger } from '@/lib/logger';

export const whatsappWorker = new Worker<WhatsAppJobData>(
  'whatsapp-queue',
  async (job) => {
    const { type, refId } = job.data;
    logger.info({ jobId: job.id, type, refId }, '[WhatsAppWorker] Job received');

    if (type === 'CLASS_REMINDER') {
      const result = await sendClassReminderService(refId, async (progress) => {
        await job.updateProgress(progress);
      });
      return result;
    }

    logger.info({ type }, '[WhatsAppWorker] Non-reminder job skipped (handled via manual communications)');
    return { skipped: true, type };
  },
  { connection, concurrency: 2 }
);

whatsappWorker.on('completed', (job, result) => {
  logger.info({ jobId: job.id, result }, '[WhatsAppWorker] Job completed successfully');
});

whatsappWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err.message }, '[WhatsAppWorker] Job failed');
});

