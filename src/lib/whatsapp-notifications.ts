import 'server-only';
import { whatsappQueue, WhatsAppJobData } from '@/workers/leaderboard.queues';
import { logger } from '@/lib/logger';

/**
 * Enqueues a WhatsApp notification job.
 * Fire-and-forget — never throws. Call after your primary DB operation succeeds.
 */
export async function sendNotification(data: WhatsAppJobData): Promise<void> {
  try {
    await whatsappQueue.add(data.type, data);
  } catch (err) {
    // Non-critical — log and continue
    logger.warn({ err, data }, '[WhatsApp] Failed to enqueue notification');
  }
}
