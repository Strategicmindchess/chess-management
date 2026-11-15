import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const { mockPrisma } = vi.hoisted(() => {
  const mPrisma = {
    user: {
      findUnique: vi.fn(),
    },
    meetingSession: {
      findUnique: vi.fn(),
    },
  };
  return { mockPrisma: mPrisma };
});

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

import { resolveParticipantIdentity } from '@/services/meet/meet-participant.service';

describe('Google Meet Participant Identity Resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('I1 — Resolves participant by authenticated Google email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-std-100',
      email: 'rohan@chess.com',
      name: 'Rohan Gupta',
      studentProfile: { id: 'sp-100' },
      coachProfile: null,
    });

    const participant = {
      name: 'conferenceRecords/c1/participants/p1',
      signedinUser: {
        user: 'rohan@chess.com',
        displayName: 'Rohan G.',
      },
    };

    const res = await resolveParticipantIdentity(participant, 'sess-1');

    expect(res.identityStatus).toBe('MATCHED');
    expect(res.userProfileId).toBe('user-std-100');
    expect(res.studentProfileId).toBe('sp-100');
  });

  it('I2 — Resolves participant by unique display name in batch roster when email missing', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    mockPrisma.meetingSession.findUnique.mockResolvedValue({
      id: 'sess-1',
      batch: {
        coach: { user: { name: 'Coach Anand', email: 'anand@chess.com' } },
        students: [
          { student: { id: 'sp-1', user: { id: 'u-1', name: 'Kabir Verma', email: 'kabir@test.com' } } },
          { student: { id: 'sp-2', user: { id: 'u-2', name: 'Dia Patel', email: 'dia@test.com' } } },
        ],
      },
    });

    const participant = {
      name: 'conferenceRecords/c1/participants/p2',
      anonymousUser: {
        displayName: 'Kabir Verma',
      },
    };

    const res = await resolveParticipantIdentity(participant, 'sess-1');

    expect(res.identityStatus).toBe('MATCHED');
    expect(res.studentProfileId).toBe('sp-1');
    expect(res.userProfileId).toBe('u-1');
  });

  it('I3 — Sets identityStatus to AMBIGUOUS if multiple students share same name and no email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    mockPrisma.meetingSession.findUnique.mockResolvedValue({
      id: 'sess-1',
      batch: {
        coach: { user: { name: 'Coach Anand', email: 'anand@chess.com' } },
        students: [
          { student: { id: 'sp-1', user: { id: 'u-1', name: 'Aarav Sharma', email: 'aarav1@test.com' } } },
          { student: { id: 'sp-2', user: { id: 'u-2', name: 'Aarav Sharma', email: 'aarav2@test.com' } } },
        ],
      },
    });

    const participant = {
      name: 'conferenceRecords/c1/participants/p3',
      anonymousUser: {
        displayName: 'Aarav Sharma',
      },
    };

    const res = await resolveParticipantIdentity(participant, 'sess-1');

    expect(res.identityStatus).toBe('AMBIGUOUS');
    expect(res.studentProfileId).toBeUndefined();
  });

  it('I4 — Sets identityStatus to UNMATCHED if person is not in batch roster', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    mockPrisma.meetingSession.findUnique.mockResolvedValue({
      id: 'sess-1',
      batch: {
        coach: { user: { name: 'Coach Anand', email: 'anand@chess.com' } },
        students: [
          { student: { id: 'sp-1', user: { id: 'u-1', name: 'Kabir Verma', email: 'kabir@test.com' } } },
        ],
      },
    });

    const participant = {
      name: 'conferenceRecords/c1/participants/p4',
      anonymousUser: {
        displayName: 'Random Guest',
      },
    };

    const res = await resolveParticipantIdentity(participant, 'sess-1');

    expect(res.identityStatus).toBe('UNMATCHED');
    expect(res.studentProfileId).toBeUndefined();
  });
});
