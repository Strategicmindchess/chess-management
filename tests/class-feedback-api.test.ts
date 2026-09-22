/**
 * API Tests — POST /api/class-feedback & GET /api/class-feedback
 *
 * Tests:
 *  F1 — valid student feedback insert → 200 + feedback object
 *  F2 — duplicate feedback (same student + classLog) → 409
 *  F3 — non-student role POSTs feedback → 403
 *  F4 — missing classLogId → 400
 *  F5 — invalid JSON body → 400
 *  F6 — teacher GETs feedback for a class → 200
 *  F7 — student tries to GET feedback list → 403
 *
 * We mock: requireRole (dal), prisma.classFeedback.create / findMany
 * We do NOT spin up an actual HTTP server — we call the route handler directly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mock server-only (required by dal.ts) ────────────────────────────────────
vi.mock('server-only', () => ({}));

// ── Mock next/navigation (used in dal.ts) ────────────────────────────────────
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

// ── Mock requireRole ─────────────────────────────────────────────────────────
const mockRequireRole = vi.fn();
vi.mock('@/lib/dal', () => ({
  requireRole: (...args: any[]) => mockRequireRole(...args),
}));

// ── Mock Prisma ───────────────────────────────────────────────────────────────
vi.mock('@/lib/prisma', () => ({
  prisma: {
    classFeedback: {
      create:   vi.fn(),
      findMany: vi.fn(),
    },
    studentProfile: {
      findUnique: vi.fn(),
    },
    // The POST route also calls prisma.attendanceRecord.findMany for the attendance-alert
    // notification logic. Without this mock it crashes with "Cannot read properties of undefined".
    attendanceRecord: {
      findMany: vi.fn(),
    },
    classLog: {
      findUnique: vi.fn(),
    },
  },
}));

import { POST, GET } from '@/app/api/class-feedback/route';
import { prisma } from '@/lib/prisma';

function makeRequest(method: string, body?: unknown, url = 'http://localhost/api/class-feedback') {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

const VALID_BODY = {
  classLogId: 'log-1',
  cameraOffOver5Min: true,
  phoneUsedOver4Times: false,
  classQualityScore: 8,
  conceptUnderstood: true,
};

describe('POST /api/class-feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // F1 — valid student feedback → 200 + feedback record
  it('F1 — valid student feedback → 200 with feedback object', async () => {
    mockRequireRole.mockResolvedValue({ id: 'user-1' }); // student role allowed
    (prisma.studentProfile.findUnique as any).mockResolvedValue({ id: 'student-1' });
    (prisma.classLog.findUnique as any).mockResolvedValue({
      batch: { students: [{ studentProfileId: 'student-1' }] }
    });
    
    const created = { id: 'fb-1', ...VALID_BODY, studentProfileId: 'student-1', submittedAt: new Date() };
    (prisma.classFeedback.create as any).mockResolvedValue(created);
    // The route's attendance-alert branch calls prisma.attendanceRecord.findMany — return empty
    // array so .length doesn't crash and the attendance threshold check is skipped.
    (prisma.attendanceRecord as any).findMany.mockResolvedValue([]);

    const res = await POST(makeRequest('POST', VALID_BODY), {} as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.feedback.id).toBe('fb-1');
    expect(prisma.classFeedback.create).toHaveBeenCalledOnce();
  });

  // F2 — duplicate feedback → 409 Conflict
  it('F2 — duplicate feedback (P2002) → 409', async () => {
    mockRequireRole.mockResolvedValue({ id: 'user-1' });
    (prisma.studentProfile.findUnique as any).mockResolvedValue({ id: 'student-1' });
    (prisma.classLog.findUnique as any).mockResolvedValue({
      batch: { students: [{ studentProfileId: 'student-1' }] }
    });

    const dupError = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
    (prisma.classFeedback.create as any).mockRejectedValue(dupError);

    const res = await POST(makeRequest('POST', VALID_BODY), {} as any);
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error).toMatch(/already submitted/i);
  });

  // F3 — non-student role → 403
  it('F3 — non-student role → 403 Forbidden', async () => {
    mockRequireRole.mockRejectedValue(new Error('Forbidden'));

    const res = await POST(makeRequest('POST', VALID_BODY), {} as any);

    expect(res.status).toBe(403);
  });

  // F4 — missing classLogId → 400
  it('F4 — missing classLogId → 400', async () => {
    mockRequireRole.mockResolvedValue({ id: 'user-1' });
    (prisma.studentProfile.findUnique as any).mockResolvedValue({ id: 'student-1' });

    const body = {}; // no classLogId
    const res = await POST(makeRequest('POST', body), {} as any);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBeTruthy();
  });

  // F5 — invalid JSON body → 400
  it('F5 — invalid JSON body → 400', async () => {
    mockRequireRole.mockResolvedValue({ id: 'user-1' });
    (prisma.studentProfile.findUnique as any).mockResolvedValue({ id: 'student-1' });

    const req = new NextRequest('http://localhost/api/class-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json{{{',
    });
    const res = await POST(req, {} as any);

    expect(res.status).toBe(400);
  });

  it('Student → non-enrolled class → rejected', async () => {
    mockRequireRole.mockResolvedValue({ id: 'user-1' });
    (prisma.studentProfile.findUnique as any).mockResolvedValue({ id: 'student-1' });
    (prisma.classLog.findUnique as any).mockResolvedValue({
      batch: { students: [{ studentProfileId: 'student-2' }] } // different student enrolled
    });

    const res = await POST(makeRequest('POST', VALID_BODY), {} as any);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/class-feedback', () => {
  beforeEach(() => vi.clearAllMocks());

  // F6 — teacher GETs feedback list → 200
  it('F6 — teacher GETs feedback for a class → 200', async () => {
    mockRequireRole.mockResolvedValue(undefined); // teacher allowed
    const feedbacks = [{ id: 'fb-1', classLogId: 'log-1' }];
    (prisma.classFeedback.findMany as any).mockResolvedValue(feedbacks);

    const req = new NextRequest('http://localhost/api/class-feedback?classLogId=log-1', { method: 'GET' });
    const res = await GET(req, {} as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.feedbacks).toHaveLength(1);
  });

  // F7 — student tries to GET feedback list → 403
  it('F7 — student GET → 403 Forbidden', async () => {
    mockRequireRole.mockRejectedValue(new Error('Forbidden'));

    const req = new NextRequest('http://localhost/api/class-feedback?classLogId=log-1', { method: 'GET' });
    const res = await GET(req, {} as any);

    expect(res.status).toBe(403);
  });
  
  it('Admin → any classLog → 200', async () => {
    mockRequireRole.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' });
    (prisma.classFeedback.findMany as any).mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/class-feedback?classLogId=log-999', { method: 'GET' });
    const res = await GET(req, {} as any);
    expect(res.status).toBe(200);
  });

  it('Teacher → own class → 200', async () => {
    mockRequireRole.mockResolvedValue({ id: 'coach-user-1', role: 'TEACHER' });
    (prisma.classLog.findUnique as any).mockResolvedValue({ coach: { userId: 'coach-user-1' } });
    (prisma.classFeedback.findMany as any).mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/class-feedback?classLogId=my-log', { method: 'GET' });
    const res = await GET(req, {} as any);
    expect(res.status).toBe(200);
  });

  it('Teacher → another coachs class → 403', async () => {
    mockRequireRole.mockResolvedValue({ id: 'coach-user-1', role: 'TEACHER' });
    (prisma.classLog.findUnique as any).mockResolvedValue({ coach: { userId: 'coach-user-999' } }); // Different user

    const req = new NextRequest('http://localhost/api/class-feedback?classLogId=other-log', { method: 'GET' });
    const res = await GET(req, {} as any);
    expect(res.status).toBe(403);
  });
});
