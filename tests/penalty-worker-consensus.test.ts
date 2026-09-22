/**
 * Additional Worker Tests — W13–W16
 *
 * These tests explicitly assert feedback-consensus penalty output:
 *  W13 — 8/10 camera OFF reports (80%) → ₹150 penalty applied
 *  W14 — 7/10 camera OFF reports (70%) → ₹0, no penalty
 *  W15 — 8/10 phone reports + historicalCount=2 → ₹250 + hasPhonePenalty=true
 *  W16 — 1-to-1 class: 1 student, 1 camera report → ₹150 (single report is enough)
 *
 * Business rule clarification for W16:
 *  In a 1-to-1 class with 1 student, only 1 feedback can ever be submitted.
 *  Therefore, a single report of a violation is sufficient to trigger the penalty.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';
import { HOUR } from './helpers';

vi.mock('ioredis', () => {
  class IORedis {
    on() { return this; }
    status = 'ready';
  }
  return { default: IORedis };
});

vi.mock('bullmq', () => {
  class Worker { constructor() {} on() { return this; } close() { return Promise.resolve(); } }
  class Queue { add() { return Promise.resolve({}); } getJobCounts() { return Promise.resolve({}); } close() { return Promise.resolve(); } }
  return { Worker, Queue };
});

vi.mock('@/lib/prisma', () => ({
  prisma: {
    classLog: { findMany: vi.fn(), count: vi.fn(), update: vi.fn() },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { processPendingPenalties } from '@/workers/penalty.worker';
import { prisma } from '@/lib/prisma';
import { JOB_NAMES } from '@/lib/leaderboard-config';
import { PENALTY_RULES } from '@/lib/penalty-engine';

const NOW = Date.now();
const JOB = { id: 'j', name: JOB_NAMES.PROCESS_PENALTIES, data: {} } as any;

function makeLog100h(overrides: Record<string, any> = {}) {
  const completedAt = new Date(NOW - 100 * HOUR); // 100h old → hard cutoff
  // FIX: extract startTime in IST (not UTC) so the worker's fromZonedTime() call
  // reconstructs classScheduledStart == completedAt exactly → 0 minutes late → ₹0 late join.
  // Old code used toISOString().slice(11,16) (UTC HH:MM) which shifted the computed
  // schedule back by 5h30m, making the coach appear 330 minutes late (+₹500 ghost penalty).
  const istDate = toZonedTime(completedAt, 'Asia/Kolkata');
  const startTimeStr = format(istDate, 'HH:mm'); // IST HH:MM — matches DB storage
  return {
    id: 'log-consensus',
    coachProfileId: 'coach-1',
    // Coach joined exactly on time → ₹0 late join
    coachJoinedAt:      completedAt,
    // Attendance marked 2h after class → well within 24h deadline → ₹0 attendance penalty
    attendanceMarkedAt: new Date(completedAt.getTime() + 2 * HOUR),
    createdAt:          completedAt,
    classInstance: { completedAt, date: completedAt, startTime: startTimeStr, status: 'COMPLETED' },
    classFeedbacks: [],
    batch: { _count: { students: 10 } },
    ...overrides,
  };
}

describe('Worker Feedback Consensus — Penalty Assertions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.classLog.update as any).mockResolvedValue({});
    (prisma.classLog.count as any).mockResolvedValue(0); // no historical phone violations
  });

  // ── W13: 8/10 camera OFF (80%) → ₹150 ────────────────────────────────────
  it('W13 — 8/10 camera OFF reports (80%) → penaltyAmount = ₹150', async () => {
    const feedbacks = [
      ...Array.from({ length: 8 }, () => ({ cameraOffOver5Min: true,  phoneUsedOver4Times: false })),
      ...Array.from({ length: 2 }, () => ({ cameraOffOver5Min: false, phoneUsedOver4Times: false })),
    ];
    (prisma.classLog.findMany as any).mockResolvedValue([makeLog100h({ classFeedbacks: feedbacks })]);

    await processPendingPenalties(JOB);

    const data = (prisma.classLog.update as any).mock.calls[0][0].data;
    expect(data.penaltyAmount).toBe(PENALTY_RULES.CAMERA_OFF_PENALTY); // ₹150
    expect(data.penaltyNote).toContain('Camera OFF');
  });

  // ── W14: 7/10 camera OFF (70%) → ₹0 ──────────────────────────────────────
  it('W14 — 7/10 camera OFF reports (70%) → penaltyAmount = ₹0', async () => {
    const feedbacks = [
      ...Array.from({ length: 7 }, () => ({ cameraOffOver5Min: true,  phoneUsedOver4Times: false })),
      ...Array.from({ length: 3 }, () => ({ cameraOffOver5Min: false, phoneUsedOver4Times: false })),
    ];
    (prisma.classLog.findMany as any).mockResolvedValue([makeLog100h({ classFeedbacks: feedbacks })]);

    await processPendingPenalties(JOB);

    const data = (prisma.classLog.update as any).mock.calls[0][0].data;
    expect(data.penaltyAmount).toBe(0);
    expect(data.penaltyNote ?? '').not.toContain('Camera OFF');
  });

  // ── W15: 8/10 phone (80%) + historicalCount=2 → ₹250 + hasPhonePenalty=true
  it('W15 — 8/10 phone reports + historicalCount=2 → ₹250, hasPhonePenalty=true', async () => {
    const feedbacks = [
      ...Array.from({ length: 8 }, () => ({ cameraOffOver5Min: false, phoneUsedOver4Times: true })),
      ...Array.from({ length: 2 }, () => ({ cameraOffOver5Min: false, phoneUsedOver4Times: false })),
    ];
    (prisma.classLog.findMany as any).mockResolvedValue([makeLog100h({ classFeedbacks: feedbacks })]);
    (prisma.classLog.count as any).mockResolvedValue(2); // 2 historical phone violations → this is 3rd

    await processPendingPenalties(JOB);

    const data = (prisma.classLog.update as any).mock.calls[0][0].data;
    expect(data.penaltyAmount).toBe(PENALTY_RULES.PHONE_USE_PENALTY); // ₹250
    expect(data.hasPhonePenalty).toBe(true);
    expect(data.penaltyNote).toContain('occurrence #3');
  });

  // ── W16: 1-to-1 class — 1 student, 1 camera report → ₹150 (1 report enough) ──
  it('W16 — 1-to-1 class: 1 camera report out of 1 → ₹150 (single report is enough)', async () => {
    const feedbacks = [{ cameraOffOver5Min: true, phoneUsedOver4Times: false }];
    const log = makeLog100h({
      classFeedbacks: feedbacks,
      batch: { _count: { students: 1 } }, // 1-to-1 class
    });
    (prisma.classLog.findMany as any).mockResolvedValue([log]);

    await processPendingPenalties(JOB);

    const data = (prisma.classLog.update as any).mock.calls[0][0].data;
    // Camera penalty MUST trigger because in 1-to-1 class, 1 report is enough
    expect(data.penaltyAmount).toBe(PENALTY_RULES.CAMERA_OFF_PENALTY);
    expect(data.penaltyNote).toContain('Camera OFF');
  });
});
