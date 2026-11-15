'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser, requireRole } from '@/lib/dal';
import { Role } from '@/lib/enums';
import { meetLogger } from '@/lib/meet/meet-logger';
import { startOrGetMeeting } from '@/services/meet/meet-space.service';

export interface StartMeetingResponse {
  success: boolean;
  meetingUrl?: string;
  meetingSessionId?: string;
  error?: string;
}

export interface JoinMeetingResponse {
  success: boolean;
  meetingUrl?: string;
  error?: string;
}

export interface MeetingStatusResponse {
  exists: boolean;
  meetingUrl?: string;
  status?: string;
  startedAt?: Date | null;
  endedAt?: Date | null;
}

/**
 * Teacher/Admin Action: Starts or retrieves the Google Meet session for a class.
 */
export async function startMeeting(classInstanceId: string): Promise<StartMeetingResponse> {
  try {
    const user = await requireRole([Role.TEACHER, Role.ADMIN]);

    meetLogger.info({ classInstanceId, userId: user.id }, 'startMeeting server action called');

    const result = await startOrGetMeeting(classInstanceId, user.id);

    return {
      success: true,
      meetingUrl: result.meetingUrl,
      meetingSessionId: result.meetingSessionId,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to start meeting';
    meetLogger.error({ error: errorMsg, classInstanceId }, 'startMeeting server action error');
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Student Action: Gated join class flow.
 * Validates enrollment, active meeting session, and the 10-minute time window.
 * Logs student click intent without creating false attendance proofs.
 */
export async function joinMeeting(classInstanceId: string): Promise<JoinMeetingResponse> {
  try {
    const user = await requireRole([Role.STUDENT]);

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      include: { user: true },
    });

    if (!studentProfile) {
      return { success: false, error: 'Student profile not found' };
    }

    // Verify class instance and active meeting session
    const instance = await prisma.classInstance.findUnique({
      where: { id: classInstanceId },
      include: {
        batch: {
          include: {
            students: { where: { studentProfileId: studentProfile.id } },
          },
        },
        meetingSession: true,
      },
    });

    if (!instance) {
      return { success: false, error: 'Class instance not found' };
    }

    if (instance.status === 'CANCELLED') {
      return { success: false, error: 'This class has been cancelled' };
    }

    // Verify enrollment
    if (!instance.batch.students || instance.batch.students.length === 0) {
      return { success: false, error: 'You are not enrolled in this batch' };
    }

    // Time window verification: from 10 minutes prior to scheduled start until class end
    const now = new Date();
    const instanceDate = new Date(instance.date);
    const isToday = now.toDateString() === instanceDate.toDateString();

    if (!isToday) {
      return { success: false, error: 'Class is not scheduled for today' };
    }

    const [startH, startM] = instance.startTime.split(':').map(Number);
    const [endH, endM] = instance.endTime.split(':').map(Number);

    const classStart = new Date(now);
    classStart.setHours(startH, startM, 0, 0);

    const classEnd = new Date(now);
    classEnd.setHours(endH, endM, 0, 0);

    const joinWindowStart = new Date(classStart.getTime() - 10 * 60 * 1000);

    if (now < joinWindowStart) {
      return { success: false, error: 'Class join window is not yet open (opens 10 minutes before class)' };
    }

    if (now > classEnd) {
      return { success: false, error: 'Class has already ended' };
    }

    // Check meeting session
    const session = instance.meetingSession;
    if (!session || session.status === 'FAILED') {
      // Fallback to static batch meetLink if teacher hasn't created space yet
      if (instance.batch.meetLink) {
        return { success: true, meetingUrl: instance.batch.meetLink };
      }
      return { success: false, error: 'Meeting has not been started by the coach yet' };
    }

    // Record student click intent in MeetingParticipantSession (NOT attendance proof)
    try {
      const participant = await prisma.meetingParticipant.upsert({
        where: {
          meetingSessionId_googleParticipantId: {
            meetingSessionId: session.id,
            googleParticipantId: `smc-student-${studentProfile.id}`,
          },
        },
        create: {
          meetingSessionId: session.id,
          googleParticipantId: `smc-student-${studentProfile.id}`,
          displayName: user.name,
          email: user.email,
          userProfileId: user.id,
          studentProfileId: studentProfile.id,
          identityStatus: 'MATCHED',
        },
        update: {
          displayName: user.name,
          email: user.email,
          userProfileId: user.id,
          studentProfileId: studentProfile.id,
          identityStatus: 'MATCHED',
        },
      });

      await prisma.meetingParticipantSession.create({
        data: {
          participantId: participant.id,
          meetingSessionId: session.id,
          joinedAt: now,
          eventSource: 'JOIN_BUTTON_CLICK',
        },
      });
    } catch (trackErr) {
      meetLogger.warn({ trackErr, studentId: studentProfile.id }, 'Failed to record student click intent');
    }

    return {
      success: true,
      meetingUrl: session.meetingUrl || instance.batch.meetLink,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to join meeting';
    meetLogger.error({ error: errorMsg, classInstanceId }, 'joinMeeting server action error');
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Returns current meeting status for a class instance.
 */
export async function getMeetingStatus(
  classInstanceId: string
): Promise<MeetingStatusResponse | null> {
  try {
    const session = await prisma.meetingSession.findUnique({
      where: { classInstanceId },
      select: {
        id: true,
        meetingUrl: true,
        status: true,
        startedAt: true,
        endedAt: true,
      },
    });

    if (!session) {
      return { exists: false };
    }

    return {
      exists: true,
      meetingUrl: session.meetingUrl,
      status: session.status,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
    };
  } catch (error) {
    meetLogger.error({ error, classInstanceId }, 'getMeetingStatus error');
    return null;
  }
}

