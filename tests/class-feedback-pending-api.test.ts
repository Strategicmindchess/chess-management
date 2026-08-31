/**
 * API Tests — GET /api/class-feedback/pending
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
    studentProfile: { findUnique: vi.fn() },
    classLog: { findMany: vi.fn() },
  },
}));

import { GET } from '@/app/api/class-feedback/pending/route';
import { prisma } from '@/lib/prisma';

function makeRequest() {
  return new NextRequest('http://localhost/api/class-feedback/pending', { method: 'GET' });
}

describe('GET /api/class-feedback/pending', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('P1 — returns pending class logs for student', async () => {
    mockRequireRole.mockResolvedValue({ id: 'user-1' });
    (prisma.studentProfile.findUnique as any).mockResolvedValue({ id: 'student-1' });

    const logs = [{ id: 'log-1' }];
    (prisma.classLog.findMany as any).mockResolvedValue(logs);

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.pendingClassLogs).toEqual(logs);
    
    // Verify query structure
    const callArgs = (prisma.classLog.findMany as any).mock.calls[0][0];
    expect(callArgs.where.classInstance.status).toBe('COMPLETED');
    expect(callArgs.where.batch.students.some.studentProfileId).toBe('student-1');
    expect(callArgs.where.classFeedbacks.none.studentProfileId).toBe('student-1');
  });

  it('P2 — non-student role → 403', async () => {
    mockRequireRole.mockRejectedValue(new Error('Forbidden'));

    const res = await GET(makeRequest());

    expect(res.status).toBe(403);
  });
});
