# Google Meet Integration — API & Action Contracts

This document specifies all Server Actions, Webhook routes, and Admin interfaces implemented for the Google Meet integration.

---

## 1. Server Actions

### 1.1 `startMeeting(classInstanceId: string)`
Initiates or retrieves a Google Meet conference for a scheduled class session.
- **File**: `src/actions/meet/meeting-actions.ts`
- **Caller Role**: `TEACHER` (must be assigned coach of this batch/class) or `ADMIN`.
- **Preconditions**:
  - `ClassInstance.status` must be `SCHEDULED`.
  - User session must be active.
- **Flow**:
  1. Checks if `MeetingSession` already exists in `ACTIVE` or `PENDING` status. If so, returns `{ success: true, meetingUrl, meetingSessionId, isNew: false }`.
  2. If none, creates Google Meet Space via REST API v2 (`POST https://meet.googleapis.com/v2/spaces`).
  3. Updates `MeetingSession` to `ACTIVE` and captures `MeetingRosterSnapshot`.
  4. Records `ClassJoinEvent` for coach tracking compatibility.
- **Return Type**:
  ```ts
  Promise<{
    success: boolean;
    meetingUrl?: string;
    meetingSessionId?: string;
    isNew?: boolean;
    error?: string;
  }>
  ```

---

### 1.2 `joinMeeting(classInstanceId: string)`
Allows an enrolled student to obtain the active meeting URL and logs their join intent.
- **File**: `src/actions/meet/meeting-actions.ts`
- **Caller Role**: `STUDENT`.
- **Access Gating**:
  - Student must be enrolled in the class's batch.
  - Class must be scheduled for today.
  - Current time must fall within the join window (up to 10 minutes prior to `startTime` through `endTime`).
- **Telemetry Invariant**:
  - Creates a `MeetingParticipantSession` with `eventSource = 'JOIN_BUTTON_CLICK'`.
  - **Does NOT** touch `AttendanceRecord` or mark class complete.
- **Return Type**:
  ```ts
  Promise<{
    success: boolean;
    meetingUrl?: string;
    error?: string;
  }>
  ```

---

### 1.3 `getMeetingStatus(classInstanceId: string)`
Queries real-time meeting state for dynamic button rendering.
- **File**: `src/actions/meet/meeting-actions.ts`
- **Return Type**:
  ```ts
  Promise<{
    status: 'NOT_STARTED' | 'ACTIVE' | 'ENDED' | 'PENDING' | 'FAILED';
    meetingUrl?: string | null;
    participantCount: number;
    startedAt?: Date | null;
  }>
  ```

---

### 1.4 `getMeetingHistory(filters)`
Paginated query for Admin meeting audit portal.
- **File**: `src/actions/meet/meeting-history-actions.ts`
- **Caller Role**: `ADMIN`.
- **Filters**:
  - `batchId?: string`
  - `coachProfileId?: string`
  - `status?: MeetingSessionStatus`
  - `startDate?: Date`
  - `endDate?: Date`
  - `page?: number` (default 1)
  - `pageSize?: number` (default 20)

---

### 1.5 `getMeetingParticipants(meetingSessionId: string)`
Fetches participant breakdown with identity resolution and durations.
- **File**: `src/actions/meet/meeting-history-actions.ts`
- **Caller Role**: `ADMIN`.
- **Returns**: Array of participants containing:
  - `displayName`, `email`, `role` (`COACH` | `STUDENT` | `GUEST`)
  - `identityStatus` (`MATCHED` | `UNMATCHED` | `AMBIGUOUS`)
  - `totalDurationSeconds`
  - Granular session intervals (`joinedAt`, `leftAt`, `durationSeconds`, `eventSource`)

---

### 1.6 `getMeetingTranscript(meetingSessionId: string)`
Fetches transcript speech entries with timestamps and speaker names.
- **File**: `src/actions/meet/meeting-history-actions.ts`
- **Caller Role**: `ADMIN`.

---

## 2. Webhook Endpoints

### 2.1 `POST /api/webhooks/google-meet`
Receives push event notifications from Google Cloud Pub/Sub.
- **File**: `src/app/api/webhooks/google-meet/route.ts`
- **Authentication**:
  - Validates Google Cloud Pub/Sub OIDC Bearer JWT if `GOOGLE_PUBSUB_AUDIENCE` is configured.
  - Verifies issuer (`https://accounts.google.com`) using Google's public JWKS certificates.
- **Payload Schema**:
  ```json
  {
    "message": {
      "messageId": "string (unique event ID)",
      "publishTime": "ISO8601 string",
      "data": "base64-encoded JSON string"
    },
    "subscription": "string"
  }
  ```
- **Response**:
  - `200 OK` `{ "status": "ACKNOWLEDGED", "eventId": "cuid...", "duplicate": false }`
  - Deduplicated messages return `200 OK` with `duplicate: true` to prevent infinite retry loops.

---

## 3. Admin Interfaces

| Route | Purpose |
|---|---|
| `/admin/meetings` | Overview table of all meeting sessions, filterable by batch, coach, and status. Shows participant counts, start times, and recording status. |
| `/admin/meetings/[classInstanceId]` | Comprehensive audit view for a specific meeting, including participant table, timeline intervals, recording playback/download, and interactive transcript explorer. |

