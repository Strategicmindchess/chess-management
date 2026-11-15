import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const { mockPrisma, mockCurrentUser } = vi.hoisted(() => {
  const mPrisma: any = {
    studentProfile: {
      findUnique: vi.fn(),
    },
    coachProfile: {
      findUnique: vi.fn(),
    },
    classInstance: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    meetingParticipant: {
      upsert: vi.fn(),
    },
    meetingParticipantSession: {
      create: vi.fn(),
    },
    attendanceRecord: {
      create: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
    classLog: {
      create: vi.fn(),
    },
    classJoinEvent: {
      findFirst: vi.fn(),
    },
    resource: {
      findMany: vi.fn(),
    },
    batchStudent: {
      findMany: vi.fn(),
    },
    batchAssignment: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    studentAssignment: {
      createMany: vi.fn(),
    },
    $transaction: vi.fn(async (cb: any) => {
      return cb(mPrisma);
    }),
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
import { submitClassLog } from '@/actions/class-log-actions';

describe('Zero-Regression & Isolation Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('R1 — joinMeeting does NOT write to attendanceRecord table', async () => {
    const now = new Date();
    const startH = String(Math.max(0, now.getHours())).padStart(2, '0');
    const startM = String(Math.max(0, now.getMinutes() - 2)).padStart(2, '0');
    const endH = String(Math.min(23, now.getHours() + 1)).padStart(2, '0');

    mockPrisma.studentProfile.findUnique.mockResolvedValue({
      id: 'student-profile-1',
      userId: 'user-student-1',
      user: mockCurrentUser,
    });

    mockPrisma.classInstance.findUnique.mockResolvedValue({
      id: 'inst-1',
      status: 'SCHEDULED',
      date: now,
      startTime: `${startH}:${startM}`,
      endTime: `${endH}:00`,
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

    mockPrisma.meetingParticipant.upsert.mockResolvedValue({
      id: 'participant-1',
    });

    const res = await joinMeeting('inst-1');
    expect(res.success).toBe(true);

    // CRITICAL: verify attendanceRecord was never touched
    expect(mockPrisma.attendanceRecord.create).not.toHaveBeenCalled();
    expect(mockPrisma.attendanceRecord.createMany).not.toHaveBeenCalled();
    expect(mockPrisma.classLog.create).not.toHaveBeenCalled();
  });

  it('R2 — joinMeeting does not mutate ClassInstance status to COMPLETED', async () => {
    const now = new Date();
    const startH = String(Math.max(0, now.getHours())).padStart(2, '0');
    const startM = String(Math.max(0, now.getMinutes() - 2)).padStart(2, '0');
    const endH = String(Math.min(23, now.getHours() + 1)).padStart(2, '0');

    mockPrisma.studentProfile.findUnique.mockResolvedValue({
      id: 'student-profile-1',
      userId: 'user-student-1',
      user: mockCurrentUser,
    });

    mockPrisma.classInstance.findUnique.mockResolvedValue({
      id: 'inst-1',
      status: 'SCHEDULED',
      date: now,
      startTime: `${startH}:${startM}`,
      endTime: `${endH}:00`,
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

    mockPrisma.meetingParticipant.upsert.mockResolvedValue({ id: 'participant-1' });

    await joinMeeting('inst-1');

    // ClassInstance status should NOT be updated by joinMeeting
    expect(mockPrisma.classInstance.update).not.toHaveBeenCalled();
  });

  it('R3 — Attendance marking remains exclusively in submitClassLog', async () => {
    // Override currentUser to TEACHER
    const teacherUser = {
      id: 'teacher-user-1',
      name: 'Coach Anand',
      email: 'anand@chess.com',
      role: 'TEACHER',
    };

    const { getCurrentUser } = await import('@/lib/dal');
    (getCurrentUser as any).mockResolvedValue(teacherUser);

    mockPrisma.coachProfile.findUnique.mockResolvedValue({ id: 'coach-1' });
    mockPrisma.classInstance.findUnique.mockResolvedValue({
      id: 'inst-1',
      status: 'SCHEDULED',
      batchId: 'batch-1',
      coachProfileId: 'coach-1',
      date: new Date(),
      startTime: '10:00',
      endTime: '11:00',
      batch: {
        id: 'batch-1',
        level: 'BEGINNER',
        _count: { classInstances: 5 },
      },
    });

    mockPrisma.classJoinEvent.findFirst.mockResolvedValue({
      id: 'join-event-1',
      joinedAt: new Date(),
    });

    mockPrisma.resource.findMany.mockResolvedValue([]);
    mockPrisma.batchStudent.findMany.mockResolvedValue([
      { studentProfileId: 'student-profile-1' },
    ]);
    mockPrisma.batchAssignment.findMany.mockResolvedValue([]);

    mockPrisma.classLog.create.mockResolvedValue({ id: 'log-1' });
    mockPrisma.classInstance.update.mockResolvedValue({ id: 'inst-1', status: 'COMPLETED' });
    mockPrisma.attendanceRecord.createMany.mockResolvedValue({ count: 1 });

    const res = await submitClassLog({
      classInstanceId: 'inst-1',
      topicCovered: 'Sicilian Defense Openings',
      durationMins: 60,
      attendance: [
        { studentId: 'student-profile-1', status: 'PRESENT' as any },
      ],
    });

    expect(res.success).toBe(true);
    expect(mockPrisma.attendanceRecord.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          studentProfileId: 'student-profile-1',
          status: 'PRESENT',
        }),
      ],
    });
    expect(mockPrisma.classInstance.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inst-1' },
        data: expect.objectContaining({ status: 'COMPLETED' }),
      })
    );
  });
});
