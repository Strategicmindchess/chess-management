import { prisma } from '@/lib/prisma';
import { meetLogger } from '@/lib/meet/meet-logger';
import { createMeetSpace } from '@/services/meet/meet-client';
import { isMeetConfigured } from '@/lib/meet/meet-config';
import { MeetDuplicateError, MeetSpaceError } from '@/lib/meet/meet-errors';

export interface StartOrGetMeetingResult {
  meetingUrl: string;
  meetingSessionId: string;
  isNew: boolean;
}

/**
 * Creates or retrieves an active Google Meet session for a class instance.
 * Guaranteed: Google API call is made OUTSIDE any database transaction.
 * Only the assigned coach or admin can start a meeting.
 */
export async function startOrGetMeeting(
  classInstanceId: string,
  callerUserId: string
): Promise<StartOrGetMeetingResult> {
  meetLogger.info({ classInstanceId, callerUserId }, 'startOrGetMeeting requested');

  // 1. Load ClassInstance with batch and enrolled students
  const instance = await prisma.classInstance.findUnique({
    where: { id: classInstanceId },
    include: {
      batch: {
        include: {
          students: { select: { studentProfileId: true } },
          coach: { select: { id: true, userId: true } },
        },
      },
      coach: { select: { id: true, userId: true } },
      meetingSession: true,
    },
  });

  if (!instance) {
    throw new Error('Class instance not found');
  }

  if (instance.status !== 'SCHEDULED') {
    throw new Error(`Cannot start meeting for class instance in ${instance.status} status`);
  }

  // 2. Authorization check: caller must be assigned coach or admin
  const effectiveCoach = instance.coach || instance.batch.coach;
  const isAssignedCoach = effectiveCoach?.userId === callerUserId;

  // Check if caller is admin
  const callerUser = await prisma.user.findUnique({
    where: { id: callerUserId },
    select: { role: true },
  });

  if (!isAssignedCoach && callerUser?.role !== 'ADMIN') {
    throw new Error('Unauthorized: You are not the assigned coach for this class');
  }

  const effectiveCoachProfileId = effectiveCoach?.id;
  if (!effectiveCoachProfileId) {
    throw new Error('No coach assigned to this class instance');
  }

  // 3. Check for existing active or pending MeetingSession
  if (instance.meetingSession) {
    const existing = instance.meetingSession;
    if (existing.status === 'ACTIVE' || existing.status === 'PENDING') {
      meetLogger.info(
        { meetingSessionId: existing.id, status: existing.status },
        'Returning existing active meeting session'
      );
      return {
        meetingUrl: existing.meetingUrl,
        meetingSessionId: existing.id,
        isNew: false,
      };
    }
  }

  // 4. Create initial MeetingSession record in PENDING state
  // Use a temporary unique placeholder for googleSpaceId
  const tempSpaceId = `pending-${classInstanceId}-${Date.now()}`;
  const fallbackUrl = instance.batch.meetLink || `https://meet.google.com/new`;

  let pendingSession;
  try {
    pendingSession = await prisma.meetingSession.upsert({
      where: { classInstanceId },
      create: {
        classInstanceId,
        batchId: instance.batchId,
        coachProfileId: effectiveCoachProfileId,
        googleSpaceId: tempSpaceId,
        meetingUrl: fallbackUrl,
        status: 'PENDING',
      },
      update: {
        googleSpaceId: tempSpaceId,
        status: 'PENDING',
      },
    });
  } catch (err) {
    meetLogger.error({ err, classInstanceId }, 'Failed to create pending MeetingSession in database');
    throw err;
  }

  // 5. Create Meet Space via Google Meet API — OUTSIDE any database transaction
  let spaceData: { spaceId: string; meetingUrl: string; name: string };
  try {
    if (isMeetConfigured()) {
      spaceData = await createMeetSpace(`SMC Batch: ${instance.batch.name}`);
    } else {
      // Fallback mode if credentials are not yet configured on this instance
      meetLogger.warn(
        { classInstanceId },
        'Google Meet API not configured in environment. Using fallback batch URL'
      );
      spaceData = {
        spaceId: `smc-${instance.batch.code.toLowerCase()}-${Date.now()}`,
        meetingUrl: instance.batch.meetLink,
        name: `spaces/smc-${instance.batch.code.toLowerCase()}`,
      };
    }
  } catch (apiError) {
    meetLogger.error({ apiError, classInstanceId }, 'Google Meet API call failed. Marking session FAILED');
    await prisma.meetingSession.update({
      where: { id: pendingSession.id },
      data: { status: 'FAILED' },
    });
    throw new MeetSpaceError(
      `Failed to create Google Meet space: ${apiError instanceof Error ? apiError.message : String(apiError)}`
    );
  }

  const now = new Date();

  // 6. Update MeetingSession to ACTIVE
  const activeSession = await prisma.meetingSession.update({
    where: { id: pendingSession.id },
    data: {
      googleSpaceId: spaceData.name,
      meetingUrl: spaceData.meetingUrl,
      status: 'ACTIVE',
      startedAt: now,
    },
  });

  // 7. Create MeetingRosterSnapshot (separate lightweight operation)
  const studentIds = instance.batch.students.map((s) => s.studentProfileId);
  await prisma.meetingRosterSnapshot.create({
    data: {
      meetingSessionId: activeSession.id,
      coachProfileId: effectiveCoachProfileId,
      enrolledStudentIds: studentIds,
      snapshotAt: now,
    },
  });

  // 8. Update ClassInstance.startedAt and record ClassJoinEvent for backward compatibility
  try {
    await prisma.$transaction(async (tx) => {
      await tx.classJoinEvent.create({
        data: {
          classInstanceId,
          coachProfileId: effectiveCoachProfileId,
          joinedAt: now,
          source: 'START_MEETING_BUTTON',
        },
      });

      if (!instance.startedAt) {
        await tx.classInstance.update({
          where: { id: classInstanceId },
          data: { startedAt: now },
        });
      }
    });
  } catch (logErr) {
    meetLogger.warn({ logErr, classInstanceId }, 'Non-critical: Failed to update startedAt / joinEvent');
  }

  meetLogger.info(
    { meetingSessionId: activeSession.id, meetingUrl: activeSession.meetingUrl },
    'Successfully created new Google Meet session'
  );

  return {
    meetingUrl: activeSession.meetingUrl,
    meetingSessionId: activeSession.id,
    isNew: true,
  };
}
