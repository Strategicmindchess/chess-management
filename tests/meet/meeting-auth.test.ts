import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

const { mockPrisma, mockCreateMeetSpace } = vi.hoisted(() => {
  const mPrisma: any = {
    classInstance: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    meetingSession: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    meetingRosterSnapshot: {
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    classJoinEvent: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (cb: any) => cb(mPrisma)),
  };

  const mCreate = vi.fn();
  return { mockPrisma: mPrisma, mockCreateMeetSpace: mCreate };
});

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

vi.mock('@/services/meet/meet-client', () => ({
  createMeetSpace: (...args: any[]) => mockCreateMeetSpace(...args),
}));

vi.mock('@/lib/meet/meet-config', () => ({
  isMeetConfigured: vi.fn(() => true),
  getMeetConfig: vi.fn(() => ({
    credentialsJson: '{"client_email":"test@test.com"}',
    spaceExpiryDays: 1,
  })),
}));

import { startOrGetMeeting } from '@/services/meet/meet-space.service';

describe('Meeting Authorization & Session Creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('A1 — Assigned coach can successfully start a new meeting', async () => {
    mockPrisma.classInstance.findUnique.mockResolvedValue({
      id: 'inst-1',
      batchId: 'batch-1',
      status: 'SCHEDULED',
      startedAt: null,
      batch: {
        id: 'batch-1',
        name: 'Grandmasters Batch',
        coach: { id: 'coach-profile-1', userId: 'user-coach-1' },
        students: [
          { studentProfileId: 'student-profile-1' },
          { studentProfileId: 'student-profile-2' },
        ],
      },
      meetingSession: null,
    });

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-coach-1',
      role: 'TEACHER',
      coachProfile: { id: 'coach-profile-1' },
    });

    mockCreateMeetSpace.mockResolvedValue({
      spaceId: 'spaces/abc-123',
      meetingUrl: 'https://meet.google.com/abc-123',
      name: 'spaces/abc-123',
    });

    mockPrisma.meetingSession.upsert.mockResolvedValue({
      id: 'session-1',
      meetingUrl: '',
      status: 'PENDING',
    });

    mockPrisma.meetingSession.update.mockResolvedValue({
      id: 'session-1',
      meetingUrl: 'https://meet.google.com/abc-123',
      status: 'ACTIVE',
    });

    const res = await startOrGetMeeting('inst-1', 'user-coach-1');

    expect(res.isNew).toBe(true);
    expect(res.meetingUrl).toBe('https://meet.google.com/abc-123');
    expect(mockCreateMeetSpace).toHaveBeenCalledWith('SMC Batch: Grandmasters Batch');
    expect(mockPrisma.meetingRosterSnapshot.create).toHaveBeenCalledWith({
      data: {
        meetingSessionId: 'session-1',
        coachProfileId: 'coach-profile-1',
        enrolledStudentIds: ['student-profile-1', 'student-profile-2'],
        snapshotAt: expect.any(Date),
      },
    });
  });

  it('A2 — Unassigned coach receives Forbidden error', async () => {
    mockPrisma.classInstance.findUnique.mockResolvedValue({
      id: 'inst-1',
      batchId: 'batch-1',
      status: 'SCHEDULED',
      batch: {
        id: 'batch-1',
        name: 'Grandmasters Batch',
        coach: { id: 'coach-profile-1', userId: 'user-coach-1' }, // Assigned to user-coach-1
        students: [],
      },
      meetingSession: null,
    });

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-coach-2',
      role: 'TEACHER',
      coachProfile: { id: 'coach-profile-2' }, // Different coach
    });

    await expect(startOrGetMeeting('inst-1', 'user-coach-2')).rejects.toThrow(
      'Unauthorized: You are not the assigned coach for this class'
    );
    expect(mockCreateMeetSpace).not.toHaveBeenCalled();
  });

  it('A3 — Calling startMeeting twice returns existing room without creating new space', async () => {
    mockPrisma.classInstance.findUnique.mockResolvedValue({
      id: 'inst-1',
      batchId: 'batch-1',
      status: 'SCHEDULED',
      batch: {
        id: 'batch-1',
        name: 'Grandmasters Batch',
        coach: { id: 'coach-profile-1', userId: 'user-coach-1' },
        students: [],
      },
      meetingSession: {
        id: 'existing-session-1',
        meetingUrl: 'https://meet.google.com/existing-room',
        status: 'ACTIVE',
      },
    });

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-coach-1',
      role: 'TEACHER',
      coachProfile: { id: 'coach-profile-1' },
    });

    const res = await startOrGetMeeting('inst-1', 'user-coach-1');

    expect(res.isNew).toBe(false);
    expect(res.meetingUrl).toBe('https://meet.google.com/existing-room');
    expect(mockCreateMeetSpace).not.toHaveBeenCalled();
  });

  it('A4 — Meeting creation is blocked if class instance is not in SCHEDULED status', async () => {
    mockPrisma.classInstance.findUnique.mockResolvedValue({
      id: 'inst-1',
      batchId: 'batch-1',
      status: 'COMPLETED',
      batch: {
        id: 'batch-1',
        name: 'Grandmasters Batch',
        coach: { id: 'coach-profile-1', userId: 'user-coach-1' },
        students: [],
      },
      meetingSession: null,
    });

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-coach-1',
      role: 'TEACHER',
      coachProfile: { id: 'coach-profile-1' },
    });

    await expect(startOrGetMeeting('inst-1', 'user-coach-1')).rejects.toThrow(
      'Cannot start meeting for class instance in COMPLETED status'
    );
    expect(mockCreateMeetSpace).not.toHaveBeenCalled();
  });
});
