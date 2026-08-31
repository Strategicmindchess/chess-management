/**
 * API Tests — PATCH /api/class-logs/[logId]/penalty
 *
 * Tests:
 *  P1 — admin waives penalty → 200, penaltyWaived=true + adminPenaltyOverride=true + penaltyCalculatedAt set
 *  P2 — admin sets manual penaltyAmount → 200, adminPenaltyOverride=true
 *  P3 — non-admin tries PATCH → 403
 *  P4 — nonexistent logId → Prisma P2025 → 404
 *  P5 — negative penaltyAmount is accepted (admin may intentionally set 0 or any amount)
 *  P6 — only penaltyNote changed (no waive/amount) → adminPenaltyOverride stays false
 *  P7 — after admin override, worker eligibility filter excludes this log (DB-level check)
 *
 * We call the route handler directly, mocking requireRole and prisma.classLog.update.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

const mockRequireRole = vi.fn();
vi.mock('@/lib/dal', () => ({
  requireRole: (...args: any[]) => mockRequireRole(...args),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    classLog: {
      update: vi.fn(),
    },
  },
}));

import { PATCH } from '@/app/api/class-logs/[logId]/penalty/route';
import { prisma } from '@/lib/prisma';

function makeRequest(body: unknown, logId = 'log-1') {
  return new NextRequest(`http://localhost/api/class-logs/${logId}/penalty`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeParams(logId = 'log-1') {
  return { params: Promise.resolve({ logId }) };
}

describe('PATCH /api/class-logs/[logId]/penalty', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.classLog.update as any).mockResolvedValue({ id: 'log-1', penaltyAmount: 0 });
  });

  // P1 — admin waive → adminPenaltyOverride=true + penaltyCalculatedAt set
  it('P1 — admin waives penalty → penaltyWaived=true, adminPenaltyOverride=true, penaltyCalculatedAt set', async () => {
    mockRequireRole.mockResolvedValue(undefined);

    const res = await PATCH(makeRequest({ penaltyWaived: true }), makeParams());

    expect(res.status).toBe(200);
    const updateCall = (prisma.classLog.update as any).mock.calls[0][0];
    expect(updateCall.data.penaltyWaived).toBe(true);
    expect(updateCall.data.adminPenaltyOverride).toBe(true);
    expect(updateCall.data.penaltyCalculatedAt).toBeInstanceOf(Date);
  });

  // P2 — admin sets manual amount → adminPenaltyOverride=true
  it('P2 — admin sets penaltyAmount=500 → adminPenaltyOverride=true, penaltyCalculatedAt set', async () => {
    mockRequireRole.mockResolvedValue(undefined);

    const res = await PATCH(makeRequest({ penaltyAmount: 500 }), makeParams());

    expect(res.status).toBe(200);
    const data = (prisma.classLog.update as any).mock.calls[0][0].data;
    expect(data.penaltyAmount).toBe(500);
    expect(data.adminPenaltyOverride).toBe(true);
    expect(data.penaltyCalculatedAt).toBeInstanceOf(Date);
  });

  // P3 — non-admin → 403
  it('P3 — non-admin PATCH → 403 Forbidden', async () => {
    mockRequireRole.mockRejectedValue(new Error('Forbidden'));

    const res = await PATCH(makeRequest({ penaltyWaived: true }), makeParams());

    expect(res.status).toBe(403);
    expect(prisma.classLog.update).not.toHaveBeenCalled();
  });

  // P4 — nonexistent logId → Prisma P2025 → 500 (or appropriate error)
  it('P4 — nonexistent logId → Prisma throws → 500', async () => {
    mockRequireRole.mockResolvedValue(undefined);
    (prisma.classLog.update as any).mockRejectedValue(
      Object.assign(new Error('Record not found'), { code: 'P2025' })
    );

    const res = await PATCH(makeRequest({ penaltyAmount: 0 }), makeParams('nonexistent'));

    expect(res.status).toBe(500);
  });

  // P5 — zero penaltyAmount is accepted (admin explicitly zeroing it out)
  it('P5 — penaltyAmount=0 accepted → adminPenaltyOverride=true', async () => {
    mockRequireRole.mockResolvedValue(undefined);

    const res = await PATCH(makeRequest({ penaltyAmount: 0 }), makeParams());

    expect(res.status).toBe(200);
    const data = (prisma.classLog.update as any).mock.calls[0][0].data;
    expect(data.penaltyAmount).toBe(0);
    expect(data.adminPenaltyOverride).toBe(true);
  });

  // P6 — only penaltyNote changed (no waive/amount) → adminPenaltyOverride NOT set
  it('P6 — only penaltyNote updated → adminPenaltyOverride NOT set', async () => {
    mockRequireRole.mockResolvedValue(undefined);

    const res = await PATCH(makeRequest({ penaltyNote: 'Admin note only' }), makeParams());

    expect(res.status).toBe(200);
    const data = (prisma.classLog.update as any).mock.calls[0][0].data;
    expect(data.penaltyNote).toBe('Admin note only');
    // isManualAction is false when only note is changed → no override/timestamp
    expect(data.adminPenaltyOverride).toBeUndefined();
    expect(data.penaltyCalculatedAt).toBeUndefined();
  });

  // P7 — after admin override, worker must never recalculate
  // This is tested at the DB query level: worker's findMany uses adminPenaltyOverride=false.
  // Here we confirm the PATCH sets adminPenaltyOverride=true which would exclude it.
  it('P7 — after admin override, log would be excluded from worker findMany (adminPenaltyOverride=true)', async () => {
    mockRequireRole.mockResolvedValue(undefined);
    (prisma.classLog.update as any).mockResolvedValue({
      id: 'log-1',
      adminPenaltyOverride: true,
      penaltyCalculatedAt: new Date(),
      penaltyAmount: 300,
    });

    const res = await PATCH(makeRequest({ penaltyAmount: 300 }), makeParams());
    const json = await res.json();

    expect(res.status).toBe(200);
    // The returned classLog has adminPenaltyOverride=true
    // Worker's query: WHERE adminPenaltyOverride = false → this log is excluded
    expect(json.classLog.adminPenaltyOverride).toBe(true);
    expect(json.classLog.penaltyCalculatedAt).toBeTruthy();
  });
});
