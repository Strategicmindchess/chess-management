import { Worker, Job } from 'bullmq';
import { connection } from '@/workers/queue';
import { processEvent } from '@/services/meet/meet-event.service';
import { meetLogger } from '@/lib/meet/meet-logger';
import { prisma } from '@/lib/prisma';

export interface MeetEventJobData {
  meetingEventId: string;
}

export const meetEventWorker = new Worker<MeetEventJobData>(
  'meet-event-queue',
  async (job: Job<MeetEventJobData>) => {
    const { meetingEventId } = job.data;
    meetLogger.info({ jobId: job.id, meetingEventId, attempt: job.attemptsMade + 1 }, 'Processing meet event job');

    try {
      await processEvent(meetingEventId);
    } catch (err) {
      meetLogger.error(
        { err, jobId: job.id, meetingEventId, attempt: job.attemptsMade + 1 },
        'Error processing meet event job'
      );

      // If exhausted all attempts, mark DEAD_LETTER
      if (job.attemptsMade + 1 >= (job.opts.attempts || 3)) {
        await prisma.meetingEvent.update({
          where: { id: meetingEventId },
          data: {
            status: 'DEAD_LETTER',
            errorMessage: `Exhausted retries: ${err instanceof Error ? err.message : String(err)}`,
          },
        }).catch((e) => meetLogger.error({ e }, 'Failed to mark event DEAD_LETTER'));
      }

      throw err;
    }
  },
  {
    connection,
    concurrency: 5,
  }
);

meetEventWorker.on('completed', (job) => {
  meetLogger.debug({ jobId: job.id }, 'Meet event job completed successfully');
});

meetEventWorker.on('failed', (job, err) => {
  meetLogger.warn({ jobId: job?.id, error: err.message }, 'Meet event job failed');
});

