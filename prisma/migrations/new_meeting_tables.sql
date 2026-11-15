-- Migration SQL: Add Google Meet Integration Models
-- Strategic Mind Chess (SMC) CRM

-- 1. Create Enums
CREATE TYPE "MeetingSessionStatus" AS ENUM ('PENDING', 'ACTIVE', 'ENDED', 'FAILED');
CREATE TYPE "MeetingIdentityStatus" AS ENUM ('MATCHED', 'UNMATCHED', 'AMBIGUOUS');
CREATE TYPE "MeetingEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'DEAD_LETTER');
CREATE TYPE "MeetingTransferStatus" AS ENUM ('PENDING', 'TRANSFERRING', 'COMPLETED', 'FAILED');
CREATE TYPE "MeetingTranscriptStatus" AS ENUM ('PENDING', 'AVAILABLE', 'FAILED');

-- 2. Create MeetingSession
CREATE TABLE "meeting_sessions" (
    "id" TEXT NOT NULL,
    "classInstanceId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "coachProfileId" TEXT NOT NULL,
    "googleSpaceId" TEXT NOT NULL,
    "meetingUrl" TEXT NOT NULL,
    "conferenceId" TEXT,
    "status" "MeetingSessionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "meeting_sessions_pkey" PRIMARY KEY ("id")
);

-- 3. Create MeetingRosterSnapshot
CREATE TABLE "meeting_roster_snapshots" (
    "id" TEXT NOT NULL,
    "meetingSessionId" TEXT NOT NULL,
    "coachProfileId" TEXT NOT NULL,
    "enrolledStudentIds" JSONB NOT NULL,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meeting_roster_snapshots_pkey" PRIMARY KEY ("id")
);

-- 4. Create MeetingParticipant
CREATE TABLE "meeting_participants" (
    "id" TEXT NOT NULL,
    "meetingSessionId" TEXT NOT NULL,
    "googleParticipantId" TEXT NOT NULL,
    "displayName" TEXT,
    "email" TEXT,
    "userProfileId" TEXT,
    "studentProfileId" TEXT,
    "coachProfileId" TEXT,
    "identityStatus" "MeetingIdentityStatus" NOT NULL DEFAULT 'UNMATCHED',
    "rawPayload" JSONB,

    CONSTRAINT "meeting_participants_pkey" PRIMARY KEY ("id")
);

-- 5. Create MeetingParticipantSession
CREATE TABLE "meeting_participant_sessions" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "meetingSessionId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL,
    "leftAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "eventSource" TEXT,

    CONSTRAINT "meeting_participant_sessions_pkey" PRIMARY KEY ("id")
);

-- 6. Create MeetingEvent
CREATE TABLE "meeting_events" (
    "id" TEXT NOT NULL,
    "googleEventId" TEXT NOT NULL,
    "meetingSessionId" TEXT,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "status" "MeetingEventStatus" NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,

    CONSTRAINT "meeting_events_pkey" PRIMARY KEY ("id")
);

-- 7. Create MeetingRecording
CREATE TABLE "meeting_recordings" (
    "id" TEXT NOT NULL,
    "meetingSessionId" TEXT NOT NULL,
    "googleDriveFileId" TEXT NOT NULL,
    "googleDriveUrl" TEXT,
    "mimeType" TEXT,
    "sizeBytes" BIGINT,
    "s3Key" TEXT,
    "transferStatus" "MeetingTransferStatus" NOT NULL DEFAULT 'PENDING',
    "transferError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meeting_recordings_pkey" PRIMARY KEY ("id")
);

-- 8. Create MeetingTranscript
CREATE TABLE "meeting_transcripts" (
    "id" TEXT NOT NULL,
    "meetingSessionId" TEXT NOT NULL,
    "googleDocId" TEXT,
    "status" "MeetingTranscriptStatus" NOT NULL DEFAULT 'PENDING',
    "processingError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meeting_transcripts_pkey" PRIMARY KEY ("id")
);

-- 9. Create MeetingTranscriptEntry
CREATE TABLE "meeting_transcript_entries" (
    "id" TEXT NOT NULL,
    "transcriptId" TEXT NOT NULL,
    "participantId" TEXT,
    "speakerName" TEXT,
    "text" TEXT NOT NULL,
    "startOffsetMs" INTEGER,
    "endOffsetMs" INTEGER,

    CONSTRAINT "meeting_transcript_entries_pkey" PRIMARY KEY ("id")
);

-- Unique Constraints
CREATE UNIQUE INDEX "meeting_sessions_classInstanceId_key" ON "meeting_sessions"("classInstanceId");
CREATE UNIQUE INDEX "meeting_sessions_googleSpaceId_key" ON "meeting_sessions"("googleSpaceId");
CREATE UNIQUE INDEX "meeting_participants_meetingSessionId_googleParticipantId_key" ON "meeting_participants"("meetingSessionId", "googleParticipantId");
CREATE UNIQUE INDEX "meeting_events_googleEventId_key" ON "meeting_events"("googleEventId");
CREATE UNIQUE INDEX "meeting_recordings_meetingSessionId_key" ON "meeting_recordings"("meetingSessionId");
CREATE UNIQUE INDEX "meeting_transcripts_meetingSessionId_key" ON "meeting_transcripts"("meetingSessionId");

-- Performance Indexes
CREATE INDEX "meeting_sessions_classInstanceId_idx" ON "meeting_sessions"("classInstanceId");
CREATE INDEX "meeting_sessions_batchId_idx" ON "meeting_sessions"("batchId");
CREATE INDEX "meeting_sessions_status_idx" ON "meeting_sessions"("status");
CREATE INDEX "meeting_roster_snapshots_meetingSessionId_idx" ON "meeting_roster_snapshots"("meetingSessionId");
CREATE INDEX "meeting_participants_meetingSessionId_idx" ON "meeting_participants"("meetingSessionId");
CREATE INDEX "meeting_participant_sessions_meetingSessionId_idx" ON "meeting_participant_sessions"("meetingSessionId");
CREATE INDEX "meeting_participant_sessions_participantId_idx" ON "meeting_participant_sessions"("participantId");
CREATE INDEX "meeting_events_status_receivedAt_idx" ON "meeting_events"("status", "receivedAt");
CREATE INDEX "meeting_events_meetingSessionId_idx" ON "meeting_events"("meetingSessionId");
CREATE INDEX "meeting_transcript_entries_transcriptId_idx" ON "meeting_transcript_entries"("transcriptId");

-- Foreign Key Constraints
ALTER TABLE "meeting_sessions" ADD CONSTRAINT "meeting_sessions_classInstanceId_fkey" FOREIGN KEY ("classInstanceId") REFERENCES "class_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meeting_sessions" ADD CONSTRAINT "meeting_sessions_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meeting_sessions" ADD CONSTRAINT "meeting_sessions_coachProfileId_fkey" FOREIGN KEY ("coachProfileId") REFERENCES "coach_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "meeting_roster_snapshots" ADD CONSTRAINT "meeting_roster_snapshots_meetingSessionId_fkey" FOREIGN KEY ("meetingSessionId") REFERENCES "meeting_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "meeting_participants" ADD CONSTRAINT "meeting_participants_meetingSessionId_fkey" FOREIGN KEY ("meetingSessionId") REFERENCES "meeting_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "meeting_participant_sessions" ADD CONSTRAINT "meeting_participant_sessions_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "meeting_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meeting_participant_sessions" ADD CONSTRAINT "meeting_participant_sessions_meetingSessionId_fkey" FOREIGN KEY ("meetingSessionId") REFERENCES "meeting_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "meeting_events" ADD CONSTRAINT "meeting_events_meetingSessionId_fkey" FOREIGN KEY ("meetingSessionId") REFERENCES "meeting_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "meeting_recordings" ADD CONSTRAINT "meeting_recordings_meetingSessionId_fkey" FOREIGN KEY ("meetingSessionId") REFERENCES "meeting_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "meeting_transcripts" ADD CONSTRAINT "meeting_transcripts_meetingSessionId_fkey" FOREIGN KEY ("meetingSessionId") REFERENCES "meeting_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "meeting_transcript_entries" ADD CONSTRAINT "meeting_transcript_entries_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "meeting_transcripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meeting_transcript_entries" ADD CONSTRAINT "meeting_transcript_entries_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "meeting_participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

