import { prisma } from '@/lib/prisma';
import { meetLogger } from '@/lib/meet/meet-logger';
import {
  GoogleParticipant,
  listParticipants,
  listParticipantSessions,
} from '@/services/meet/meet-client';
import { isMeetConfigured } from '@/lib/meet/meet-config';

export interface IdentityResolution {
  identityStatus: 'MATCHED' | 'UNMATCHED' | 'AMBIGUOUS';
  userProfileId?: string;
  studentProfileId?: string;
  coachProfileId?: string;
  displayName?: string;
  email?: string;
}

/**
 * Resolves the identity of a Google Meet participant against SMC database users.
 * Attempts matching in the following order:
 * 1. Participant email vs User.email
 * 2. Display Name vs Enrolled Students and Coach display names
 */
export async function resolveParticipantIdentity(
  participant: GoogleParticipant,
  meetingSessionId: string
): Promise<IdentityResolution> {
  const email = participant.signedinUser?.user;
  const displayName =
    participant.signedinUser?.displayName ||
    participant.anonymousUser?.displayName ||
    participant.phoneUser?.displayName ||
    '';

  // 1. Try matching by email
  if (email) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        studentProfile: true,
        coachProfile: true,
      },
    });

    if (user) {
      return {
        identityStatus: 'MATCHED',
        userProfileId: user.id,
        studentProfileId: user.studentProfile?.id,
        coachProfileId: user.coachProfile?.id,
        displayName: user.name,
        email: user.email,
      };
    }
  }

  // 2. Fetch the session and roster snapshot for context
  const session = await prisma.meetingSession.findUnique({
    where: { id: meetingSessionId },
    include: {
      batch: {
        include: {
          students: {
            include: {
              student: {
                include: { user: true },
              },
            },
          },
          coach: {
            include: { user: true },
          },
        },
      },
    },
  });

  if (!session || !displayName) {
    return {
      identityStatus: 'UNMATCHED',
      displayName,
      email,
    };
  }

  // Check coach match
  const coachUser = session.batch.coach?.user;
  if (coachUser && displayName.trim().toLowerCase() === coachUser.name.trim().toLowerCase()) {
    return {
      identityStatus: 'MATCHED',
      userProfileId: coachUser.id,
      coachProfileId: session.batch.coach?.id,
      displayName: coachUser.name,
      email: coachUser.email,
    };
  }

  // Check student name matches
  const matchingStudents = session.batch.students.filter(
    (s) => s.student.user.name.trim().toLowerCase() === displayName.trim().toLowerCase()
  );

  if (matchingStudents.length === 1) {
    const s = matchingStudents[0];
    return {
      identityStatus: 'MATCHED',
      userProfileId: s.student.user.id,
      studentProfileId: s.student.id,
      displayName: s.student.user.name,
      email: s.student.user.email,
    };
  } else if (matchingStudents.length > 1) {
    return {
      identityStatus: 'AMBIGUOUS',
      displayName,
      email,
    };
  }

  return {
    identityStatus: 'UNMATCHED',
    displayName,
    email,
  };
}

/**
 * Syncs participants and their join/leave intervals from Google Meet API into the database.
 */
export async function syncParticipants(meetingSessionId: string): Promise<void> {
  const session = await prisma.meetingSession.findUnique({
    where: { id: meetingSessionId },
  });

  if (!session || !session.conferenceId) {
    meetLogger.debug({ meetingSessionId }, 'No conference ID available to sync participants');
    return;
  }

  if (!isMeetConfigured()) {
    meetLogger.debug('Google Meet not configured; skipping syncParticipants');
    return;
  }

  try {
    const googleParticipants = await listParticipants(session.googleSpaceId, session.conferenceId);

    for (const gp of googleParticipants) {
      const resolution = await resolveParticipantIdentity(gp, meetingSessionId);

      // Upsert participant
      const participant = await prisma.meetingParticipant.upsert({
        where: {
          meetingSessionId_googleParticipantId: {
            meetingSessionId,
            googleParticipantId: gp.name,
          },
        },
        create: {
          meetingSessionId,
          googleParticipantId: gp.name,
          displayName: resolution.displayName,
          email: resolution.email,
          userProfileId: resolution.userProfileId,
          studentProfileId: resolution.studentProfileId,
          coachProfileId: resolution.coachProfileId,
          identityStatus: resolution.identityStatus,
          rawPayload: gp as any,
        },
        update: {
          displayName: resolution.displayName,
          email: resolution.email,
          userProfileId: resolution.userProfileId,
          studentProfileId: resolution.studentProfileId,
          coachProfileId: resolution.coachProfileId,
          identityStatus: resolution.identityStatus,
          rawPayload: gp as any,
        },
      });

      // Sync participant sessions (intervals)
      const sessions = await listParticipantSessions(gp.name);
      for (const s of sessions) {
        if (!s.startTime) continue;
        const joinedAt = new Date(s.startTime);
        const leftAt = s.endTime ? new Date(s.endTime) : null;
        const durationSeconds = leftAt
          ? Math.max(0, Math.floor((leftAt.getTime() - joinedAt.getTime()) / 1000))
          : null;

        await prisma.meetingParticipantSession.create({
          data: {
            participantId: participant.id,
            meetingSessionId,
            joinedAt,
            leftAt,
            durationSeconds,
            eventSource: 'API_POLL',
          },
        });
      }
    }

    await prisma.meetingSession.update({
      where: { id: meetingSessionId },
      data: { lastSyncedAt: new Date() },
    });
  } catch (err) {
    meetLogger.error({ err, meetingSessionId }, 'Failed to sync participants from Google Meet');
  }
}

