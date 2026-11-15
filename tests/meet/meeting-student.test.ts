import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

const { mockPrisma, mockCurrentUser } = vi.hoisted(() => {
  const mPrisma = {
    studentProfile: {
      findUnique: vi.fn(),
    },
    classInstance: {
      findUnique: vi.fn(),
    },
    meetingParticipant: {
      upsert: vi.fn(),
    },
    meetingParticipantSession: {
      create: vi.fn(),
    },
  };

  const mUser = {
    id: 'user-student-1',
    name: 'Aarav Sharma',
    email: 'aarav@chess.com',
    role: 'STUDENT',
  };

  return { mockPrisma: mPrisma, mockCurrentUser: mUser };
});

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

vi.mock('@/lib/dal', () => ({
  requireRole: vi.fn(async () => mockCurrentUser),
  getCurrentUser: vi.fn(async () => mockCurrentUser),
}));

import { joinMeeting } from '@/actions/meet/meeting-actions';

describe('Student Meeting Gating & Join Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('S1 — Student not enrolled in batch cannot join', async () => {
    mockPrisma.studentProfile.findUnique.mockResolvedValue({
      id: 'student-profile-1',
      userId: 'user-student-1',
      user: mockCurrentUser,
    });

    mockPrisma.classInstance.findUnique.mockResolvedValue({
      id: 'inst-1',
      status: 'SCHEDULED',
      date: new Date(),
      startTime: '10:00',
      endTime: '11:00',
      batch: {
        id: 'batch-1',
        students: [], // Empty enrollment for this student
      },
      meetingSession: {
        id: 'session-1',
        meetingUrl: 'https://meet.google.com/test-room',
        status: 'ACTIVE',
      },
    });

    const res = await joinMeeting('inst-1');

    expect(res.success).toBe(false);
    expect(res.error).toContain('You are not enrolled in this batch');
  });

  it('S2 — Student trying to join class on wrong date is blocked', async () => {
    mockPrisma.studentProfile.findUnique.mockResolvedValue({
      id: 'student-profile-1',
      userId: 'user-student-1',
      user: mockCurrentUser,
    });

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    mockPrisma.classInstance.findUnique.mockResolvedValue({
      id: 'inst-1',
      status: 'SCHEDULED',
      date: yesterday,
      startTime: '10:00',
      endTime: '11:00',
      batch: {
        id: 'batch-1',
        students: [{ studentProfileId: 'student-profile-1' }],
      },
      meetingSession: {
        id: 'session-1',
        meetingUrl: 'https://meet.google.com/test-room',
        status: 'ACTIVE',
      },
    });

    const res = await joinMeeting('inst-1');

    expect(res.success).toBe(false);
    expect(res.error).toContain('Class is not scheduled for today');
  });

  it('S3 — Student joining within 10-min window succeeds and logs click intent', async () => {
    mockPrisma.studentProfile.findUnique.mockResolvedValue({
      id: 'student-profile-1',
      userId: 'user-student-1',
      user: mockCurrentUser,
    });

    const now = new Date();
    const startH = String(Math.max(0, now.getHours())).padStart(2, '0');
    const startM = String(Math.max(0, now.getMinutes() - 5)).padStart(2, '0');
    const endH = String(Math.min(23, now.getHours() + 1)).padStart(2, '0');
    const endM = '00';

    mockPrisma.classInstance.findUnique.mockResolvedValue({
      id: 'inst-1',
      status: 'SCHEDULED',
      date: now,
      startTime: `${startH}:${startM}`,
      endTime: `${endH}:${endM}`,
      batch: {
        id: 'batch-1',
        meetLink: 'https://meet.google.com/fallback-room',
        students: [{ studentProfileId: 'student-profile-1' }],
      },
      meetingSession: {
        id: 'session-1',
        meetingUrl: 'https://meet.google.com/active-meet-room',
        status: 'ACTIVE',
      },
    });

    mockPrisma.meetingParticipant.upsert.mockResolvedValue({
      id: 'participant-1',
    });

    const res = await joinMeeting('inst-1');

    expect(res.success).toBe(true);
    expect(res.meetingUrl).toBe('https://meet.google.com/active-meet-room');
    expect(mockPrisma.meetingParticipantSession.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventSource: 'JOIN_BUTTON_CLICK',
        meetingSessionId: 'session-1',
      }),
    });
  });
});
