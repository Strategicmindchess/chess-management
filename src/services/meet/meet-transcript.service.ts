import { prisma } from '@/lib/prisma';
import { meetLogger } from '@/lib/meet/meet-logger';
import { listTranscriptEntries } from '@/services/meet/meet-client';
import { isMeetConfigured } from '@/lib/meet/meet-config';

/**
 * Handles incoming transcript ready notification.
 */
export async function handleTranscriptReady(
  meetingSessionId: string,
  transcriptId: string
): Promise<void> {
  meetLogger.info({ meetingSessionId, transcriptId }, 'handleTranscriptReady called');

  const transcript = await prisma.meetingTranscript.upsert({
    where: { meetingSessionId },
    create: {
      meetingSessionId,
      googleDocId: transcriptId,
      status: 'AVAILABLE',
    },
    update: {
      googleDocId: transcriptId,
      status: 'AVAILABLE',
      processingError: null,
    },
  });

  try {
    await syncTranscriptEntries(transcript.id);
  } catch (err) {
    meetLogger.warn({ err, transcriptId: transcript.id }, 'Initial sync of transcript entries failed');
  }
}

/**
 * Ingests entries from Google Meet Transcript API into meeting_transcript_entries.
 */
export async function syncTranscriptEntries(meetingTranscriptId: string): Promise<void> {
  const transcript = await prisma.meetingTranscript.findUnique({
    where: { id: meetingTranscriptId },
    include: {
      meetingSession: {
        include: { participants: true },
      },
    },
  });

  if (!transcript || !transcript.googleDocId) {
    meetLogger.warn({ meetingTranscriptId }, 'Transcript not found or has no Google document ID');
    return;
  }

  if (!isMeetConfigured()) {
    meetLogger.debug('Google Meet not configured; skipping syncTranscriptEntries');
    return;
  }

  try {
    const entries = await listTranscriptEntries(transcript.googleDocId);

    for (const entry of entries) {
      if (!entry.text) continue;

      // Find matching participant if possible
      const matchedParticipant = transcript.meetingSession.participants.find(
        (p) => p.googleParticipantId === entry.participant || p.displayName === entry.participant
      );

      const startOffsetMs = entry.startTime
        ? Math.max(0, new Date(entry.startTime).getTime())
        : undefined;
      const endOffsetMs = entry.endTime
        ? Math.max(0, new Date(entry.endTime).getTime())
        : undefined;

      await prisma.meetingTranscriptEntry.create({
        data: {
          transcriptId: transcript.id,
          participantId: matchedParticipant?.id || null,
          speakerName: matchedParticipant?.displayName || entry.participant || 'Speaker',
          text: entry.text,
          startOffsetMs,
          endOffsetMs,
        },
      });
    }

    meetLogger.info(
      { meetingTranscriptId, entriesCount: entries.length },
      'Successfully synced transcript entries'
    );
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    meetLogger.error({ err, meetingTranscriptId }, 'Failed to sync transcript entries');

    await prisma.meetingTranscript.update({
      where: { id: meetingTranscriptId },
      data: {
        status: 'FAILED',
        processingError: errorMsg,
      },
    });

    throw err;
  }
}

