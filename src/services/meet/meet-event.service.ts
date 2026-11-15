import { prisma } from '@/lib/prisma';
import { meetLogger } from '@/lib/meet/meet-logger';
import { handleRecordingReady } from '@/services/meet/meet-recording.service';
import { handleTranscriptReady } from '@/services/meet/meet-transcript.service';
import { resolveParticipantIdentity } from '@/services/meet/meet-participant.service';

/**
 * Persists an incoming Google Pub/Sub event durably.
 * Ensures strict idempotency via unique googleEventId.
 */
export async function persistEvent(
  googleEventId: string,
  eventType: string,
  payload: unknown
): Promise<{ id: string; isDuplicate: boolean }> {
  const existing = await prisma.meetingEvent.findUnique({
    where: { googleEventId },
    select: { id: true },
  });

  if (existing) {
    meetLogger.debug({ googleEventId }, 'Event already persisted (idempotent)');
    return { id: existing.id, isDuplicate: true };
  }

  // Attempt to correlate with meetingSession if space name is in payload
  let meetingSessionId: string | null = null;
  const p = payload as Record<string, any>;
  const spaceName = p?.space?.name || p?.conferenceRecord?.space || p?.spaceName;

  if (spaceName) {
    const session = await prisma.meetingSession.findFirst({
      where: {
        OR: [
          { googleSpaceId: spaceName },
          { googleSpaceId: spaceName.replace('spaces/', '') },
        ],
      },
      select: { id: true },
    });
    if (session) meetingSessionId = session.id;
  }

  const created = await prisma.meetingEvent.create({
    data: {
      googleEventId,
      eventType,
      meetingSessionId,
      payload: (payload ?? {}) as any,
      status: 'PENDING',
    },
  });

  return { id: created.id, isDuplicate: false };
}

/**
 * Processes a stored MeetingEvent.
 * Fully idempotent: will early-exit if already PROCESSED.
 */
export async function processEvent(meetingEventId: string): Promise<void> {
  const event = await prisma.meetingEvent.findUnique({
    where: { id: meetingEventId },
  });

  if (!event) {
    throw new Error(`MeetingEvent ${meetingEventId} not found`);
  }

  if (event.status === 'PROCESSED') {
    meetLogger.debug({ meetingEventId }, 'Event already processed; skipping');
    return;
  }

  // Mark as PROCESSING
  await prisma.meetingEvent.update({
    where: { id: meetingEventId },
    data: { status: 'PROCESSING' },
  });

  try {
    const payload = (event.payload || {}) as Record<string, any>;
    const now = new Date();

    // Correlate session if not yet linked
    let sessionId = event.meetingSessionId;
    if (!sessionId) {
      const spaceName = payload.space?.name || payload.conferenceRecord?.space || payload.spaceName;
      if (spaceName) {
        const found = await prisma.meetingSession.findFirst({
          where: {
            OR: [
              { googleSpaceId: spaceName },
              { googleSpaceId: spaceName.replace('spaces/', '') },
            ],
          },
          select: { id: true },
        });
        if (found) {
          sessionId = found.id;
          await prisma.meetingEvent.update({
            where: { id: meetingEventId },
            data: { meetingSessionId: sessionId },
          });
        }
      }
    }

    const type = event.eventType.toLowerCase();

    // 1. Conference / Session Started
    if (type.includes('conference.started') || type.includes('space.active')) {
      if (sessionId) {
        const conferenceId = payload.conferenceRecord?.name || payload.conferenceId;
        await prisma.meetingSession.update({
          where: { id: sessionId },
          data: {
            status: 'ACTIVE',
            startedAt: event.receivedAt,
            conferenceId: conferenceId || undefined,
          },
        });
      }
    }

    // 2. Conference / Session Ended
    else if (type.includes('conference.ended') || type.includes('space.ended')) {
      if (sessionId) {
        await prisma.meetingSession.update({
          where: { id: sessionId },
          data: {
            status: 'ENDED',
            endedAt: event.receivedAt,
          },
        });
      }
    }

    // 3. Participant Joined
    else if (type.includes('participant.joined') || type.includes('participant_joined')) {
      if (sessionId && payload.participant) {
        const pData = payload.participant;
        const resolution = await resolveParticipantIdentity(pData, sessionId);

        const participant = await prisma.meetingParticipant.upsert({
          where: {
            meetingSessionId_googleParticipantId: {
              meetingSessionId: sessionId,
              googleParticipantId: pData.name,
            },
          },
          create: {
            meetingSessionId: sessionId,
            googleParticipantId: pData.name,
            displayName: resolution.displayName,
            email: resolution.email,
            userProfileId: resolution.userProfileId,
            studentProfileId: resolution.studentProfileId,
            coachProfileId: resolution.coachProfileId,
            identityStatus: resolution.identityStatus,
            rawPayload: pData,
          },
          update: {
            displayName: resolution.displayName,
            email: resolution.email,
            userProfileId: resolution.userProfileId,
            studentProfileId: resolution.studentProfileId,
            coachProfileId: resolution.coachProfileId,
            identityStatus: resolution.identityStatus,
          },
        });

        const joinedAt = payload.eventTime ? new Date(payload.eventTime) : now;
        await prisma.meetingParticipantSession.create({
          data: {
            participantId: participant.id,
            meetingSessionId: sessionId,
            joinedAt,
            eventSource: 'PUBSUB',
          },
        });
      }
    }

    // 4. Participant Left
    else if (type.includes('participant.left') || type.includes('participant_left')) {
      if (sessionId && payload.participant) {
        const pData = payload.participant;
        const participant = await prisma.meetingParticipant.findUnique({
          where: {
            meetingSessionId_googleParticipantId: {
              meetingSessionId: sessionId,
              googleParticipantId: pData.name,
            },
          },
        });

        if (participant) {
          const leftAt = payload.eventTime ? new Date(payload.eventTime) : now;
          // Find the active open session
          const openSession = await prisma.meetingParticipantSession.findFirst({
            where: {
              participantId: participant.id,
              leftAt: null,
            },
            orderBy: { joinedAt: 'desc' },
          });

          if (openSession) {
            const durationSeconds = Math.max(
              0,
              Math.floor((leftAt.getTime() - openSession.joinedAt.getTime()) / 1000)
            );
            await prisma.meetingParticipantSession.update({
              where: { id: openSession.id },
              data: {
                leftAt,
                durationSeconds,
              },
            });
          }
        }
      }
    }

    // 5. Recording Ready
    else if (type.includes('recording') && (type.includes('ready') || type.includes('fileuploaded'))) {
      if (sessionId) {
        const driveFileId = payload.driveFileId || payload.fileId || payload.recording?.driveFileId;
        if (driveFileId) {
          await handleRecordingReady(sessionId, driveFileId);
        }
      }
    }

    // 6. Transcript Ready
    else if (type.includes('transcript') && (type.includes('ready') || type.includes('available'))) {
      if (sessionId) {
        const transcriptId = payload.transcriptId || payload.documentId || payload.transcript?.name;
        if (transcriptId) {
          await handleTranscriptReady(sessionId, transcriptId);
        }
      }
    }

    // Mark event PROCESSED
    await prisma.meetingEvent.update({
      where: { id: meetingEventId },
      data: {
        status: 'PROCESSED',
        processedAt: new Date(),
        errorMessage: null,
      },
    });

    meetLogger.info({ meetingEventId, eventType: event.eventType }, 'Successfully processed MeetingEvent');
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    meetLogger.error({ err, meetingEventId }, 'Error processing MeetingEvent');

    await prisma.meetingEvent.update({
      where: { id: meetingEventId },
      data: {
        status: 'FAILED',
        retryCount: { increment: 1 },
        errorMessage: errorMsg,
      },
    });

    throw err;
  }
}
