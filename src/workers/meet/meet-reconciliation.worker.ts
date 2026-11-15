import { Worker, Job, Queue } from 'bullmq';
import { connection } from '@/workers/queue';
import { prisma } from '@/lib/prisma';
import { meetLogger } from '@/lib/meet/meet-logger';
import { getMeetSpace } from '@/services/meet/meet-client';
import { syncParticipants } from '@/services/meet/meet-participant.service';
import { isMeetConfigured } from '@/lib/meet/meet-config';

export const meetReconciliationQueue = new Queue('meet-reconciliation-queue', { connection });

export async function runMeetingReconciliation(): Promise<void> {
  meetLogger.info('Starting meeting reconciliation run');

  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

  // Scan ACTIVE sessions started > 4h ago with no endedAt
  const staleSessions = await prisma.meetingSession.findMany({
    where: {
      status: 'ACTIVE',
      endedAt: null,
      createdAt: { lt: fourHoursAgo },
    },
    include: {
      classInstance: true,
    },
  });

  meetLogger.info({ staleCount: staleSessions.length }, 'Found stale active meeting sessions');

  for (const session of staleSessions) {
    try {
      if (isMeetConfigured() && session.googleSpaceId) {
        try {
          const spaceInfo = await getMeetSpace(session.googleSpaceId);
          // If active conference has ended
          if (!spaceInfo.activeConferenceId) {
            await syncParticipants(session.id);
            await prisma.meetingSession.update({
              where: { id: session.id },
              data: {
                status: 'ENDED',
                endedAt: new Date(),
              },
            });
            meetLogger.info({ sessionId: session.id }, 'Reconciled and ended stale meeting session');
            continue;
          }
        } catch (apiErr) {
          meetLogger.warn({ apiErr, sessionId: session.id }, 'Could not query space info during reconciliation');
        }
      }

      // If class instance has passed end time by > 4 hours, mark session ENDED
      await prisma.meetingSession.update({
        where: { id: session.id },
        data: {
          status: 'ENDED',
          endedAt: new Date(),
        },
      });
      meetLogger.info({ sessionId: session.id }, 'Marked stale meeting session as ENDED');
    } catch (err) {
      meetLogger.error({ err, sessionId: session.id }, 'Failed to reconcile meeting session');
    }
  }
}

export const meetReconciliationWorker = new Worker(
  'meet-reconciliation-queue',
  async (job: Job) => {
    meetLogger.info({ jobId: job.id }, 'Running meet reconciliation job');
    await runMeetingReconciliation();
  },
  {
    connection,
    concurrency: 1,
  }
);

