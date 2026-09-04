/**
 * Penalty Worker
 *
 * Runs daily via BullMQ repeatable job. For every COMPLETED ClassLog that:
 *   - has NOT been finalized (penaltyCalculatedAt IS NULL)
 *   - has NOT been admin-overridden (adminPenaltyOverride = false)
 *   - has NOT been waived (penaltyWaived = false)
 *
 * It applies the 48h/96h eligibility window, calls the pure penalty-engine,
 * and writes the final result back to the database. Once penaltyCalculatedAt
 * is set, the worker will never touch that record again.
 *
 * Eligibility windows:
 *   < 48h           → SKIP (feedback collection window open)
 *   48h–96h         → Process only if ≥50% of enrolled students submitted feedback
 *   ≥96h (4 days)   → Hard cutoff: finalize with whatever feedback is available
 *
 * After Admin waive/override, the PATCH endpoint also sets penaltyCalculatedAt
 * so this worker skips those records automatically.
 */

import { Worker, type Job } from 'bullmq';
import { connection } from '@/workers/queue';
import { QUEUE_NAMES, JOB_NAMES } from '@/lib/leaderboard-config';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { calculatePenalty, type PenaltyEngineInput } from '@/lib/penalty-engine';

// ─── Timing Constants ─────────────────────────────────────────────────────────
const HOURS_48  = 48 * 60 * 60 * 1_000;
const HOURS_96  = 96 * 60 * 60 * 1_000;
const THRESHOLD_50_PERCENT = 0.5;

// ─── Main Processor ───────────────────────────────────────────────────────────
export async function processPendingPenalties(job: Job): Promise<void> {
  // Guard: only handle the expected job name
  if (job.name !== JOB_NAMES.PROCESS_PENALTIES) return;

  const now = Date.now();
  logger.info('[PenaltyWorker] Starting daily penalty processing run...');

  // 1. Fetch all eligible class logs
  const eligibleLogs = await prisma.classLog.findMany({
    where: {
      penaltyCalculatedAt: null,
      adminPenaltyOverride: false,
      penaltyWaived: false,
      classInstance: {
        status: 'COMPLETED',
      },
    },
    include: {
      classInstance: true,
      classFeedbacks: {
        select: {
          cameraOffOver5Min: true,
          phoneUsedOver4Times: true,
        },
      },
      batch: {
        select: {
          _count: {
            select: { students: true },
          },
        },
      },
    },
  });

  logger.info(`[PenaltyWorker] Found ${eligibleLogs.length} eligible logs to evaluate.`);
  let processed = 0;
  let skipped = 0;

  for (const log of eligibleLogs) {
    try {
      // ── Determine the completion anchor timestamp ─────────────────────────
      // Prefer ClassInstance.completedAt → ClassLog.attendanceMarkedAt → log.createdAt
      const completionTime: Date =
        log.classInstance?.completedAt ??
        log.attendanceMarkedAt ??
        log.createdAt;

      const ageMs = now - completionTime.getTime();

      // ── Skip: < 48h (feedback window still open) ─────────────────────────
      if (ageMs < HOURS_48) {
        skipped++;
        continue;
      }

      // ── 48h–96h: only finalize if ≥50% feedback submitted ─────────────────
      const totalEnrolled = log.batch._count.students;
      const totalFeedbacksSubmitted = log.classFeedbacks.length;
      const feedbackRatio = totalEnrolled > 0 ? totalFeedbacksSubmitted / totalEnrolled : 1;

      if (ageMs < HOURS_96 && feedbackRatio < THRESHOLD_50_PERCENT) {
        skipped++;
        logger.info(
          `[PenaltyWorker] SKIP (${totalFeedbacksSubmitted}/${totalEnrolled} feedbacks, ` +
          `${Math.round(feedbackRatio * 100)}% < 50%) — ClassLog ${log.id}`
        );
        continue;
      }

      // ── 96h+ OR ≥50%: FINALIZE ──────────────────────────────────────────
      // Derive scheduled start from ClassInstance
      const instance = log.classInstance;
      if (!instance) {
        logger.warn(`[PenaltyWorker] ClassLog ${log.id} has no associated ClassInstance — skipping.`);
        skipped++;
        continue;
      }

      const classDateStr = instance.date.toISOString().slice(0, 10);
      const classScheduledStart = new Date(`${classDateStr}T${instance.startTime}:00.000Z`);

      // Count historical phone penalties for this coach (past classes only)
      const historicalPhonePenaltyCount = await prisma.classLog.count({
        where: {
          coachProfileId: log.coachProfileId,
          hasPhonePenalty: true,
          id: { not: log.id }, // exclude current log
        },
      });

      // Aggregate feedback violations
      const cameraOffReports = log.classFeedbacks.filter(f => f.cameraOffOver5Min).length;
      const phoneUsageReports = log.classFeedbacks.filter(f => f.phoneUsedOver4Times).length;

      const engineInput: PenaltyEngineInput = {
        coachJoinedAt: log.coachJoinedAt,
        classScheduledStart,
        attendanceMarkedAt: log.attendanceMarkedAt ?? log.createdAt,
        classCompletedAt: completionTime,
        totalFeedbacksSubmitted,
        cameraOffReports,
        phoneUsageReports,
        historicalPhonePenaltyCount,
        totalStudents: totalEnrolled,
      };

      const { totalPenalty, breakdown, hasPhonePenalty } = calculatePenalty(engineInput);

      // Save result — strict SET, not +=
      await prisma.classLog.update({
        where: { id: log.id },
        data: {
          penaltyAmount: totalPenalty,
          penaltyNote: breakdown.length > 0 ? breakdown.join('; ') : null,
          hasPhonePenalty,
          penaltyCalculatedAt: new Date(),
        },
      });

      processed++;
      logger.info(
        `[PenaltyWorker] FINALIZED ClassLog ${log.id} — ₹${totalPenalty} ` +
        `(${totalFeedbacksSubmitted}/${totalEnrolled} feedbacks, age: ${Math.round(ageMs / 3_600_000)}h)`
      );
    } catch (err: any) {
      logger.error(`[PenaltyWorker] Error processing ClassLog ${log.id}: ${err.message}`);
    }
  }

  logger.info(
    `[PenaltyWorker] Run complete — processed: ${processed}, skipped: ${skipped}, ` +
    `total evaluated: ${eligibleLogs.length}`
  );
}

// ─── Worker Registration ──────────────────────────────────────────────────────
export const penaltyWorker = new Worker(
  QUEUE_NAMES.PENALTY,
  async (job) => {
    if (job.name === JOB_NAMES.PROCESS_PENALTIES) {
      await processPendingPenalties(job);
    }
  },
  { connection }
);

penaltyWorker.on('completed', (job) => {
  logger.info(`[PenaltyWorker] Job ${job.id} (${job.name}) completed.`);
});

penaltyWorker.on('failed', (job, err) => {
  logger.error(`[PenaltyWorker] Job ${job?.id} (${job?.name}) failed: ${err.message}`);
});
