'use server';

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/dal';
import { Role } from '@/lib/enums';
import { meetLogger } from '@/lib/meet/meet-logger';

export interface ParticipantRecord {
  id: string;
  displayName: string | null;
  email: string | null;
  role: 'COACH' | 'STUDENT' | 'GUEST';
  identityStatus: string;
  totalDurationSeconds: number;
  firstJoinedAt: Date | null;
  lastLeftAt: Date | null;
  sessionsCount: number;
}

export interface MeetingHistoryResponse {
  session: {
    id: string;
    classInstanceId: string;
    batchName: string;
    batchCode: string;
    coachName: string;
    meetingUrl: string;
    googleSpaceId: string;
    status: string;
    createdAt: Date;
    startedAt: Date | null;
    endedAt: Date | null;
  } | null;
  recording: {
    id: string;
    googleDriveFileId: string;
    googleDriveUrl: string | null;
    s3Key: string | null;
    transferStatus: string;
  } | null;
  participants: ParticipantRecord[];
  eventsCount: number;
}

export interface TranscriptPage {
  entries: Array<{
    id: string;
    speakerName: string | null;
    text: string;
    startOffsetMs: number | null;
    endOffsetMs: number | null;
  }>;
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Admin Action: Fetch full meeting history for a class instance.
 */
export async function getMeetingHistory(
  classInstanceId: string
): Promise<MeetingHistoryResponse> {
  await requireRole([Role.ADMIN]);

  const meetingSession = await prisma.meetingSession.findUnique({
    where: { classInstanceId },
    include: {
      classInstance: {
        include: {
          batch: {
            include: {
              coach: { include: { user: true } },
            },
          },
        },
      },
      coachProfile: { include: { user: true } },
      recording: true,
      participants: {
        include: {
          sessions: true,
        },
      },
      _count: {
        select: { events: true },
      },
    },
  });

  if (!meetingSession) {
    return {
      session: null,
      recording: null,
      participants: [],
      eventsCount: 0,
    };
  }

  const participants: ParticipantRecord[] = meetingSession.participants.map((p) => {
    let role: 'COACH' | 'STUDENT' | 'GUEST' = 'GUEST';
    if (p.coachProfileId) role = 'COACH';
    else if (p.studentProfileId) role = 'STUDENT';

    let totalDurationSeconds = 0;
    let firstJoinedAt: Date | null = null;
    let lastLeftAt: Date | null = null;

    for (const s of p.sessions) {
      if (s.durationSeconds) totalDurationSeconds += s.durationSeconds;
      if (!firstJoinedAt || s.joinedAt < firstJoinedAt) firstJoinedAt = s.joinedAt;
      if (s.leftAt && (!lastLeftAt || s.leftAt > lastLeftAt)) lastLeftAt = s.leftAt;
    }

    return {
      id: p.id,
      displayName: p.displayName,
      email: p.email,
      role,
      identityStatus: p.identityStatus,
      totalDurationSeconds,
      firstJoinedAt,
      lastLeftAt,
      sessionsCount: p.sessions.length,
    };
  });

  return {
    session: {
      id: meetingSession.id,
      classInstanceId: meetingSession.classInstanceId,
      batchName: meetingSession.classInstance.batch.name,
      batchCode: meetingSession.classInstance.batch.code,
      coachName: meetingSession.coachProfile.user.name,
      meetingUrl: meetingSession.meetingUrl,
      googleSpaceId: meetingSession.googleSpaceId,
      status: meetingSession.status,
      createdAt: meetingSession.createdAt,
      startedAt: meetingSession.startedAt,
      endedAt: meetingSession.endedAt,
    },
    recording: meetingSession.recording
      ? {
          id: meetingSession.recording.id,
          googleDriveFileId: meetingSession.recording.googleDriveFileId,
          googleDriveUrl: meetingSession.recording.googleDriveUrl,
          s3Key: meetingSession.recording.s3Key,
          transferStatus: meetingSession.recording.transferStatus,
        }
      : null,
    participants,
    eventsCount: meetingSession._count.events,
  };
}

/**
 * Admin Action: Fetch participants of a meeting session.
 */
export async function getMeetingParticipants(
  meetingSessionId: string
): Promise<ParticipantRecord[]> {
  await requireRole([Role.ADMIN]);

  const participants = await prisma.meetingParticipant.findMany({
    where: { meetingSessionId },
    include: { sessions: true },
  });

  return participants.map((p) => {
    let role: 'COACH' | 'STUDENT' | 'GUEST' = 'GUEST';
    if (p.coachProfileId) role = 'COACH';
    else if (p.studentProfileId) role = 'STUDENT';

    let totalDurationSeconds = 0;
    let firstJoinedAt: Date | null = null;
    let lastLeftAt: Date | null = null;

    for (const s of p.sessions) {
      if (s.durationSeconds) totalDurationSeconds += s.durationSeconds;
      if (!firstJoinedAt || s.joinedAt < firstJoinedAt) firstJoinedAt = s.joinedAt;
      if (s.leftAt && (!lastLeftAt || s.leftAt > lastLeftAt)) lastLeftAt = s.leftAt;
    }

    return {
      id: p.id,
      displayName: p.displayName,
      email: p.email,
      role,
      identityStatus: p.identityStatus,
      totalDurationSeconds,
      firstJoinedAt,
      lastLeftAt,
      sessionsCount: p.sessions.length,
    };
  });
}

/**
 * Admin Action: Fetch paginated meeting transcript entries.
 */
export async function getMeetingTranscript(
  meetingSessionId: string,
  page = 1
): Promise<TranscriptPage> {
  await requireRole([Role.ADMIN]);

  const take = 50;
  const skip = (page - 1) * take;

  const transcript = await prisma.meetingTranscript.findUnique({
    where: { meetingSessionId },
    include: {
      entries: {
        skip,
        take,
        orderBy: { startOffsetMs: 'asc' },
      },
      _count: {
        select: { entries: true },
      },
    },
  });

  if (!transcript) {
    return {
      entries: [],
      total: 0,
      page,
      totalPages: 0,
    };
  }

  const total = transcript._count.entries;
  const totalPages = Math.ceil(total / take);

  return {
    entries: transcript.entries.map((e) => ({
      id: e.id,
      speakerName: e.speakerName,
      text: e.text,
      startOffsetMs: e.startOffsetMs,
      endOffsetMs: e.endOffsetMs,
    })),
    total,
    page,
    totalPages,
  };
}

