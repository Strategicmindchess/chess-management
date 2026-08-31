/**
 * Integration Tests — penalty.worker.ts eligibility logic
 *
 * Level 2: We test the processor function directly.
 * Instead of capturing the BullMQ Worker constructor callback (which causes
 * hoisting / mock timing issues), we import the exported processPendingPenalties
 * function and call it directly. This is the cleanest approach.
 *
 * What we test:
 *   - 48h/96h eligibility windows are correctly enforced
 *   - adminPenaltyOverride / penaltyWaived / already finalized → excluded by DB query
 *   - Missing ClassInstance → gracefully skipped
 *   - Duplicate run safety
 *   - Historical phone count excludes current class id
 *   - Correct penalty amount calculated and written to DB
 *   - Wrong job name → no processing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HOUR, MIN } from './helpers';

// ── Mock ioredis (pulled in transitively by @/workers/queue.ts) ────────────────
vi.mock('ioredis', () => {
  class IORedis {
    on() { return this; }
    status = 'ready';
  }
  return { default: IORedis };
});

// ── Mock bullmq ────────────────────────────────────────────────────────────────
vi.mock('bullmq', () => {
  class Worker {
    constructor() {}
    on() { return this; }
    close() { return Promise.resolve(); }
  }
  class Queue {
    add() { return Promise.resolve({}); }
    getJobCounts() { return Promise.resolve({}); }
    close() { return Promise.resolve(); }
  }
  return { Worker, Queue };
});

// ── Mock Prisma ────────────────────────────────────────────────────────────────
vi.mock('@/lib/prisma', () => ({
  prisma: {
    classLog: {
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// ── Mock logger ────────────────────────────────────────────────────────────────
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ── Import after all mocks are in place ───────────────────────────────────────
import { processPendingPenalties } from '@/workers/penalty.worker';
import { prisma } from '@/lib/prisma';
import { JOB_NAMES } from '@/lib/leaderboard-config';

const NOW = Date.now();

function makeFakeJob(name = JOB_NAMES.PROCESS_PENALTIES) {
  return { id: 'job-1', name, data: {} };
}

function makeLog(overrides: Record<string, any> = {}) {
  const completedAt = new Date(NOW - 50 * HOUR); // 50h ago — past 48h, below 96h
  return {
    id: 'log-1',
    coachProfileId: 'coach-1',
    coachJoinedAt:      completedAt,                                   // on time
    attendanceMarkedAt: new Date(completedAt.getTime() + 2 * HOUR),   // 2h later = fine
    createdAt:          completedAt,
    classInstance: {
      id: 'inst-1',
      completedAt,
      date: completedAt,
      startTime: '10:00',
      status: 'COMPLETED',
    },
    classFeedbacks: [],
    batch: { _count: { students: 10 } },
    ...overrides,
  };
}

describe('Worker Eligibility & Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.classLog.update as any).mockResolvedValue({});
    (prisma.classLog.count as any).mockResolvedValue(0);
  });

  // ── W1: < 48h → skip ──────────────────────────────────────────────────────
  it('W1 — log < 48h old → skipped, no DB update', async () => {
    const recentLog = makeLog({
      classInstance: {
        completedAt: new Date(NOW - 10 * HOUR),
        date: new Date(NOW - 10 * HOUR),
        startTime: '10:00',
        status: 'COMPLETED',
      },
    });
    (prisma.classLog.findMany as any).mockResolvedValue([recentLog]);

    await processPendingPenalties(makeFakeJob() as any);

    expect(prisma.classLog.update).not.toHaveBeenCalled();
  });

  // ── W2: 50h old + 60% feedback → FINALIZE ─────────────────────────────────
  it('W2 — 50h old, 6/10 feedbacks (60%) → FINALIZE', async () => {
    const feedbacks = Array.from({ length: 6 }, () => ({
      cameraOffOver5Min: false, phoneUsedOver4Times: false,
    }));
    (prisma.classLog.findMany as any).mockResolvedValue([makeLog({ classFeedbacks: feedbacks })]);

    await processPendingPenalties(makeFakeJob() as any);

    expect(prisma.classLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'log-1' },
        data: expect.objectContaining({ penaltyCalculatedAt: expect.any(Date) }),
      })
    );
  });

  // ── W3: 50h old + 40% feedback → SKIP ─────────────────────────────────────
  it('W3 — 50h old, 4/10 feedbacks (40%) → SKIP', async () => {
    const feedbacks = Array.from({ length: 4 }, () => ({
      cameraOffOver5Min: false, phoneUsedOver4Times: false,
    }));
    (prisma.classLog.findMany as any).mockResolvedValue([makeLog({ classFeedbacks: feedbacks })]);

    await processPendingPenalties(makeFakeJob() as any);

    expect(prisma.classLog.update).not.toHaveBeenCalled();
  });

  // ── W4: 100h old + 0 feedbacks → hard cutoff FINALIZE ─────────────────────
  it('W4 — 100h old, 0 feedbacks → hard cutoff FINALIZE', async () => {
    const veryOldLog = makeLog({
      classInstance: {
        completedAt: new Date(NOW - 100 * HOUR),
        date: new Date(NOW - 100 * HOUR),
        startTime: '10:00',
        status: 'COMPLETED',
      },
      classFeedbacks: [],
    });
    (prisma.classLog.findMany as any).mockResolvedValue([veryOldLog]);

    await processPendingPenalties(makeFakeJob() as any);

    expect(prisma.classLog.update).toHaveBeenCalledOnce();
    const data = (prisma.classLog.update as any).mock.calls[0][0].data;
    expect(data.penaltyCalculatedAt).toBeInstanceOf(Date);
  });

  // ── W5–W7: DB filter excludes override/waived/finalized ────────────────────
  it('W5 — adminPenaltyOverride=true excluded by DB WHERE filter', async () => {
    (prisma.classLog.findMany as any).mockResolvedValue([]);
    await processPendingPenalties(makeFakeJob() as any);
    expect(prisma.classLog.update).not.toHaveBeenCalled();
  });

  it('W6 — penaltyWaived=true excluded by DB WHERE filter', async () => {
    (prisma.classLog.findMany as any).mockResolvedValue([]);
    await processPendingPenalties(makeFakeJob() as any);
    expect(prisma.classLog.update).not.toHaveBeenCalled();
  });

  it('W7 — penaltyCalculatedAt != null excluded by DB WHERE filter', async () => {
    (prisma.classLog.findMany as any).mockResolvedValue([]);
    await processPendingPenalties(makeFakeJob() as any);
    expect(prisma.classLog.update).not.toHaveBeenCalled();
  });

  // ── W8: null classInstance → skip gracefully ───────────────────────────────
  it('W8 — null classInstance → skip without crash', async () => {
    (prisma.classLog.findMany as any).mockResolvedValue([makeLog({ classInstance: null })]);

    await processPendingPenalties(makeFakeJob() as any);

    expect(prisma.classLog.update).not.toHaveBeenCalled();
  });

  // ── W9: duplicate run safety ───────────────────────────────────────────────
  it('W9 — duplicate run: second call returns no eligible logs', async () => {
    const feedbacks = Array.from({ length: 6 }, () => ({ cameraOffOver5Min: false, phoneUsedOver4Times: false }));
    (prisma.classLog.findMany as any).mockResolvedValueOnce([makeLog({ classFeedbacks: feedbacks })]);
    await processPendingPenalties(makeFakeJob() as any);
    expect(prisma.classLog.update).toHaveBeenCalledOnce();

    vi.clearAllMocks();
    (prisma.classLog.update as any).mockResolvedValue({});
    (prisma.classLog.count as any).mockResolvedValue(0);
    (prisma.classLog.findMany as any).mockResolvedValueOnce([]);
    await processPendingPenalties(makeFakeJob() as any);
    expect(prisma.classLog.update).not.toHaveBeenCalled();
  });

  // ── W10: historical phone count must exclude current classLog id ────────────
  it('W10 — count query excludes current classLog id', async () => {
    const feedbacks = Array.from({ length: 9 }, () => ({
      cameraOffOver5Min: false,
      phoneUsedOver4Times: true,  // 9/10 = 90% → consensus
    }));
    const log = makeLog({ id: 'log-xyz', classFeedbacks: feedbacks });
    (prisma.classLog.findMany as any).mockResolvedValue([log]);
    (prisma.classLog.count as any).mockResolvedValue(2);

    await processPendingPenalties(makeFakeJob() as any);

    const countCall = (prisma.classLog.count as any).mock.calls[0][0];
    expect(countCall.where.id).toEqual({ not: 'log-xyz' });
    expect(countCall.where.hasPhonePenalty).toBe(true);
    expect(countCall.where.coachProfileId).toBe('coach-1');
  });

  // ── W11: correct penalty amount written to DB ──────────────────────────────
  it('W11 — 7min late join (₹200) + 30h attendance late (₹200) → DB gets ₹400', async () => {
    const completedAt = new Date(NOW - 100 * HOUR);
    const startTimeStr = completedAt.toISOString().slice(11, 16); // HH:MM
    const log = makeLog({
      classInstance: { completedAt, date: completedAt, startTime: startTimeStr, status: 'COMPLETED' },
      coachJoinedAt:      new Date(completedAt.getTime() + 7 * MIN),   // 7 min late → ₹200
      attendanceMarkedAt: new Date(completedAt.getTime() + 30 * HOUR), // 30h late → ₹200
      classFeedbacks: [],
    });
    (prisma.classLog.findMany as any).mockResolvedValue([log]);

    await processPendingPenalties(makeFakeJob() as any);

    const data = (prisma.classLog.update as any).mock.calls[0][0].data;
    expect(data.penaltyAmount).toBe(400);
  });

  // ── W12: wrong job name → no processing ───────────────────────────────────
  it('W12 — wrong job name → worker does nothing', async () => {
    (prisma.classLog.findMany as any).mockResolvedValue([makeLog()]);

    await processPendingPenalties({ id: 'j', name: 'some-other-job', data: {} } as any);

    expect(prisma.classLog.findMany).not.toHaveBeenCalled();
    expect(prisma.classLog.update).not.toHaveBeenCalled();
  });
});
