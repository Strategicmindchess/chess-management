/**
 * Demo Test — Coach "Misses a Class" Penalty Scenario
 *
 * Account under test:
 *   Admin/Viewer:  shivamgupta.2dev1@gmail.com
 *   Coach:         teacher@gmail.com
 *
 * This test file demonstrates the CORRECT expected behaviour of the penalty
 * worker when a coach misses or is late to a class. It also serves as the
 * regression guard for the IST/UTC timezone bug that caused a spurious Rs.500
 * late-join penalty to appear on every class log.
 *
 * THE BUG (now fixed in this file):
 *   Old helpers sliced startTime from completedAt.toISOString() (UTC "HH:MM")
 *   Worker treats instance.startTime as IST via fromZonedTime()
 *   Shift = 5h30m => coach appeared 330 minutes late => ghost Rs.500 penalty
 *
 * THE FIX applied here:
 *   makeLog() uses toZonedTime() + format(istDate, 'HH:mm') => IST "HH:MM"
 *   Worker round-trips correctly => 0 extra minutes => correct penalties only
 *
 * Test IDs: DM1-DM12
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';
import { HOUR, MIN } from './helpers';

vi.mock('ioredis', () => {
  class IORedis { on() { return this; } status = 'ready'; }
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
const JOB = { id: 'demo-job', name: JOB_NAMES.PROCESS_PENALTIES, data: {} } as any;
const TIME_ZONE = 'Asia/Kolkata';

/**
 * Build a fake ClassLog for teacher@gmail.com.
 * ageHours: how old the class is (must be >= 96 for hard-cutoff finalization)
 *
 * KEY FIX: startTime is extracted in IST format, NOT UTC format.
 * Worker uses fromZonedTime(`${istDate} ${startTime}`, IST) to reconstruct
 * classScheduledStart. If startTime is UTC, the shift = 5h30m => ghost Rs.500.
 */
function makeLog(ageHours: number, overrides: Record<string, any> = {}) {
  const completedAt = new Date(NOW - ageHours * HOUR);
  const istDate = toZonedTime(completedAt, TIME_ZONE);
  const startTimeStr = format(istDate, 'HH:mm'); // IST HH:mm — correct

  return {
    id: `log-dm-${ageHours}h`,
    coachProfileId: 'teacher-profile-id',
    coachJoinedAt: completedAt,                                      // on time by default
    attendanceMarkedAt: new Date(completedAt.getTime() + 2 * HOUR), // within 24h
    createdAt: completedAt,
    classInstance: { completedAt, date: completedAt, startTime: startTimeStr, status: 'COMPLETED' },
    classFeedbacks: [],
    batch: { _count: { students: 10 } },
    ...overrides,
  };
}

describe('Demo — teacher@gmail.com Miss-a-Class Penalty Scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.classLog.update as any).mockResolvedValue({});
    (prisma.classLog.count as any).mockResolvedValue(0);
  });

  it('DM1 — Coach on time, attends correctly, no complaints → Rs.0', async () => {
    (prisma.classLog.findMany as any).mockResolvedValue([makeLog(100)]);
    await processPendingPenalties(JOB);
    const data = (prisma.classLog.update as any).mock.calls[0][0].data;
    expect(data.penaltyAmount).toBe(0);
    expect(data.penaltyNote).toBeNull();
    expect(data.hasPhonePenalty).toBe(false);
  });

  it('DM2 — Coach never joined, never marked attendance (100h old) → Rs.200 attendance penalty', async () => {
    // coachJoinedAt=null → engine skips late-join check entirely
    // attendanceMarkedAt=null, class 100h old > 24h deadline → Rs.200
    (prisma.classLog.findMany as any).mockResolvedValue([
      makeLog(100, { coachJoinedAt: null, attendanceMarkedAt: null }),
    ]);
    await processPendingPenalties(JOB);
    const data = (prisma.classLog.update as any).mock.calls[0][0].data;
    expect(data.penaltyAmount).toBe(PENALTY_RULES.ATTENDANCE_DEADLINE_PENALTY); // Rs.200
    expect(data.penaltyNote).toContain('never marked');
  });

  it('DM3 — 7min late join + 30h attendance late → Rs.200 + Rs.200 = Rs.400', async () => {
    const completedAt = new Date(NOW - 100 * HOUR);
    const istDate = toZonedTime(completedAt, TIME_ZONE);
    const startTimeStr = format(istDate, 'HH:mm');
    (prisma.classLog.findMany as any).mockResolvedValue([{
      id: 'log-dm3', coachProfileId: 'teacher-profile-id',
      coachJoinedAt:      new Date(completedAt.getTime() + 7 * MIN),
      attendanceMarkedAt: new Date(completedAt.getTime() + 30 * HOUR),
      createdAt: completedAt,
      classInstance: { completedAt, date: completedAt, startTime: startTimeStr, status: 'COMPLETED' },
      classFeedbacks: [], batch: { _count: { students: 10 } },
    }]);
    await processPendingPenalties(JOB);
    const data = (prisma.classLog.update as any).mock.calls[0][0].data;
    expect(data.penaltyAmount).toBe(400);
    expect(data.penaltyNote).toContain('Late join');
    expect(data.penaltyNote).toContain('Attendance marked');
  });

  it('DM4 — 15min late join + never marks attendance → Rs.500 + Rs.200 = Rs.700', async () => {
    // 15 min late → Rs.500 (10+ min tier)
    // attendanceMarkedAt=null, class 100h old > 24h → Rs.200
    const completedAt = new Date(NOW - 100 * HOUR);
    const istDate = toZonedTime(completedAt, TIME_ZONE);
    const startTimeStr = format(istDate, 'HH:mm');
    (prisma.classLog.findMany as any).mockResolvedValue([{
      id: 'log-dm4', coachProfileId: 'teacher-profile-id',
      coachJoinedAt:      new Date(completedAt.getTime() + 15 * MIN),
      attendanceMarkedAt: null,
      createdAt: completedAt,
      classInstance: { completedAt, date: completedAt, startTime: startTimeStr, status: 'COMPLETED' },
      classFeedbacks: [], batch: { _count: { students: 10 } },
    }]);
    await processPendingPenalties(JOB);
    const data = (prisma.classLog.update as any).mock.calls[0][0].data;
    expect(data.penaltyAmount).toBe(700); // Rs.500 + Rs.200
    expect(data.penaltyNote).toContain('Late join: 15 min late');
    expect(data.penaltyNote).toContain('never marked');
  });

  it('DM5 — 8/10 students report camera off (80%) → Rs.150', async () => {
    const feedbacks = [
      ...Array.from({ length: 8 }, () => ({ cameraOffOver5Min: true,  phoneUsedOver4Times: false })),
      ...Array.from({ length: 2 }, () => ({ cameraOffOver5Min: false, phoneUsedOver4Times: false })),
    ];
    (prisma.classLog.findMany as any).mockResolvedValue([makeLog(100, { classFeedbacks: feedbacks })]);
    await processPendingPenalties(JOB);
    const data = (prisma.classLog.update as any).mock.calls[0][0].data;
    expect(data.penaltyAmount).toBe(PENALTY_RULES.CAMERA_OFF_PENALTY);
    expect(data.penaltyNote).toContain('Camera OFF');
    expect(data.penaltyNote).toContain('8/10');
  });

  it('DM6 — 7/10 camera off (70%) — below threshold → Rs.0', async () => {
    const feedbacks = [
      ...Array.from({ length: 7 }, () => ({ cameraOffOver5Min: true,  phoneUsedOver4Times: false })),
      ...Array.from({ length: 3 }, () => ({ cameraOffOver5Min: false, phoneUsedOver4Times: false })),
    ];
    (prisma.classLog.findMany as any).mockResolvedValue([makeLog(100, { classFeedbacks: feedbacks })]);
    await processPendingPenalties(JOB);
    const data = (prisma.classLog.update as any).mock.calls[0][0].data;
    expect(data.penaltyAmount).toBe(0);
    expect(data.penaltyNote ?? '').not.toContain('Camera OFF');
  });

  it('DM7 — 8/10 phone reports, 3rd occurrence → Rs.250', async () => {
    const feedbacks = [
      ...Array.from({ length: 8 }, () => ({ cameraOffOver5Min: false, phoneUsedOver4Times: true })),
      ...Array.from({ length: 2 }, () => ({ cameraOffOver5Min: false, phoneUsedOver4Times: false })),
    ];
    (prisma.classLog.findMany as any).mockResolvedValue([makeLog(100, { classFeedbacks: feedbacks })]);
    (prisma.classLog.count as any).mockResolvedValue(2);
    await processPendingPenalties(JOB);
    const data = (prisma.classLog.update as any).mock.calls[0][0].data;
    expect(data.penaltyAmount).toBe(PENALTY_RULES.PHONE_USE_PENALTY);
    expect(data.hasPhonePenalty).toBe(true);
    expect(data.penaltyNote).toContain('occurrence #3');
  });

  it('DM8 — 8/10 phone reports, 1st occurrence → Rs.0 but hasPhonePenalty=true (warning)', async () => {
    const feedbacks = [
      ...Array.from({ length: 8 }, () => ({ cameraOffOver5Min: false, phoneUsedOver4Times: true })),
      ...Array.from({ length: 2 }, () => ({ cameraOffOver5Min: false, phoneUsedOver4Times: false })),
    ];
    (prisma.classLog.findMany as any).mockResolvedValue([makeLog(100, { classFeedbacks: feedbacks })]);
    (prisma.classLog.count as any).mockResolvedValue(0);
    await processPendingPenalties(JOB);
    const data = (prisma.classLog.update as any).mock.calls[0][0].data;
    expect(data.penaltyAmount).toBe(0);
    expect(data.hasPhonePenalty).toBe(true);
    expect(data.penaltyNote).toContain('occurrence #1');
  });

  it('DM9 — 1-to-1 class: single student reports camera off → Rs.150 (1 report is enough)', async () => {
    const feedbacks = [{ cameraOffOver5Min: true, phoneUsedOver4Times: false }];
    (prisma.classLog.findMany as any).mockResolvedValue([
      makeLog(100, { classFeedbacks: feedbacks, batch: { _count: { students: 1 } } }),
    ]);
    await processPendingPenalties(JOB);
    const data = (prisma.classLog.update as any).mock.calls[0][0].data;
    expect(data.penaltyAmount).toBe(PENALTY_RULES.CAMERA_OFF_PENALTY);
    expect(data.penaltyNote).toContain('Camera OFF');
  });

  it('DM10 — Worst case: 7min late + camera 80% + phone 3rd → Rs.200+Rs.150+Rs.250 = Rs.600', async () => {
    const completedAt = new Date(NOW - 100 * HOUR);
    const istDate = toZonedTime(completedAt, TIME_ZONE);
    const startTimeStr = format(istDate, 'HH:mm');
    const feedbacks = [
      ...Array.from({ length: 8 }, () => ({ cameraOffOver5Min: true, phoneUsedOver4Times: true })),
      ...Array.from({ length: 2 }, () => ({ cameraOffOver5Min: false, phoneUsedOver4Times: false })),
    ];
    (prisma.classLog.findMany as any).mockResolvedValue([{
      id: 'log-dm10', coachProfileId: 'teacher-profile-id',
      coachJoinedAt:      new Date(completedAt.getTime() + 7 * MIN),
      attendanceMarkedAt: new Date(completedAt.getTime() + 2 * HOUR),
      createdAt: completedAt,
      classInstance: { completedAt, date: completedAt, startTime: startTimeStr, status: 'COMPLETED' },
      classFeedbacks: feedbacks, batch: { _count: { students: 10 } },
    }]);
    (prisma.classLog.count as any).mockResolvedValue(2);
    await processPendingPenalties(JOB);
    const data = (prisma.classLog.update as any).mock.calls[0][0].data;
    expect(data.penaltyAmount).toBe(600);
    expect(data.penaltyNote).toContain('Late join');
    expect(data.penaltyNote).toContain('Camera OFF');
    expect(data.penaltyNote).toContain('occurrence #3');
    expect(data.hasPhonePenalty).toBe(true);
  });

  it('DM11 — Class only 10h old → SKIP (feedback window open, no update)', async () => {
    (prisma.classLog.findMany as any).mockResolvedValue([makeLog(10)]);
    await processPendingPenalties(JOB);
    expect(prisma.classLog.update).not.toHaveBeenCalled();
  });

  it('DM12 — 50h old, 4/10 feedbacks (40% < 50%) → SKIP until 96h cutoff', async () => {
    const feedbacks = Array.from({ length: 4 }, () => ({ cameraOffOver5Min: false, phoneUsedOver4Times: false }));
    (prisma.classLog.findMany as any).mockResolvedValue([makeLog(50, { classFeedbacks: feedbacks })]);
    await processPendingPenalties(JOB);
    expect(prisma.classLog.update).not.toHaveBeenCalled();
  });
});
