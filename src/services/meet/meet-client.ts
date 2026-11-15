import { SignJWT, importPKCS8 } from 'jose';
import { getMeetConfig, isMeetConfigured } from '@/lib/meet/meet-config';
import { meetLogger } from '@/lib/meet/meet-logger';
import {
  MeetConfigError,
  MeetAuthError,
  MeetSpaceError,
} from '@/lib/meet/meet-errors';

export interface GoogleParticipant {
  name: string;
  earliestStartTime?: string;
  latestEndTime?: string;
  signedinUser?: {
    user?: string;
    displayName?: string;
  };
  anonymousUser?: {
    displayName?: string;
  };
  phoneUser?: {
    displayName?: string;
  };
}

export interface GoogleParticipantSession {
  name: string;
  startTime?: string;
  endTime?: string;
}

export interface GoogleTranscript {
  name: string;
  state?: string;
  startTime?: string;
  endTime?: string;
  docsDestination?: {
    document?: string;
    exportUri?: string;
  };
}

export interface GoogleTranscriptEntry {
  name: string;
  participant?: string;
  text?: string;
  languageCode?: string;
  startTime?: string;
  endTime?: string;
}

// In-memory token cache
let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

/**
 * Retrieves a valid Google API access token using Service Account JWT assertion
 * or OAuth 2.0 refresh token.
 */
async function getAccessToken(): Promise<string> {
  if (!isMeetConfigured()) {
    throw new MeetConfigError('Google Meet credentials are not configured.');
  }

  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && tokenExpiresAt > now + 60) {
    return cachedAccessToken;
  }

  const config = getMeetConfig();

  // 1. Try Service Account JSON
  if (config.credentialsJson) {
    try {
      const parsedCreds = JSON.parse(config.credentialsJson);

      if (parsedCreds.private_key && parsedCreds.client_email) {
        meetLogger.debug('Generating Google Service Account access token');
        const privateKey = await importPKCS8(parsedCreds.private_key, 'RS256');

        const jwtPayload: Record<string, unknown> = {
          iss: parsedCreds.client_email,
          scope: [
            'https://www.googleapis.com/auth/meetings.space.created',
            'https://www.googleapis.com/auth/meetings.space.readonly',
            'https://www.googleapis.com/auth/drive.readonly',
          ].join(' '),
          aud: 'https://oauth2.googleapis.com/token',
        };

        if (config.workspaceEmail) {
          jwtPayload.sub = config.workspaceEmail;
        }

        const assertion = await new SignJWT(jwtPayload)
          .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
          .setIssuedAt(now)
          .setExpirationTime(now + 3600)
          .sign(privateKey);

        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion,
          }),
        });

        if (!tokenRes.ok) {
          const errBody = await tokenRes.text();
          meetLogger.error({ status: tokenRes.status, body: errBody }, 'Token exchange failed');
          throw new MeetAuthError(`Failed to authenticate with Google: ${errBody}`);
        }

        const tokenData = await tokenRes.json();
        cachedAccessToken = tokenData.access_token;
        tokenExpiresAt = now + (tokenData.expires_in || 3600);
        return cachedAccessToken!;
      }

      // Check if credentials JSON is an OAuth client with refresh_token
      if (parsedCreds.refresh_token && parsedCreds.client_id && parsedCreds.client_secret) {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: parsedCreds.client_id,
            client_secret: parsedCreds.client_secret,
            refresh_token: parsedCreds.refresh_token,
          }),
        });

        if (!tokenRes.ok) {
          throw new MeetAuthError(`OAuth refresh token exchange failed: ${await tokenRes.text()}`);
        }

        const tokenData = await tokenRes.json();
        cachedAccessToken = tokenData.access_token;
        tokenExpiresAt = now + (tokenData.expires_in || 3600);
        return cachedAccessToken!;
      }
    } catch (err) {
      if (err instanceof MeetAuthError) throw err;
      meetLogger.error({ err }, 'Error parsing credentials or signing JWT');
      throw new MeetAuthError(`Invalid credentials format: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  throw new MeetConfigError('No valid Google Meet authentication credentials found.');
}

/**
 * Creates a new Google Meet space using Google Meet REST API v2.
 */
export async function createMeetSpace(
  title: string
): Promise<{ spaceId: string; meetingUrl: string; name: string }> {
  if (!isMeetConfigured()) {
    throw new MeetConfigError();
  }

  const token = await getAccessToken();
  meetLogger.info({ title }, 'Calling Google Meet API to create space');

  const res = await fetch('https://meet.googleapis.com/v2/spaces', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      config: {
        accessType: 'OPEN',
      },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    meetLogger.error({ status: res.status, body: errorText }, 'Google Meet space creation failed');
    if (res.status === 401 || res.status === 403) {
      throw new MeetAuthError(`Google API unauthorized: ${errorText}`);
    }
    throw new MeetSpaceError(`Failed to create Meet space: ${errorText}`);
  }

  const data = await res.json();
  const name = data.name; // e.g. "spaces/abc-defg-hij"
  const meetingUrl = data.meetingUri || `https://meet.google.com/${data.meetingCode || name.replace('spaces/', '')}`;
  const spaceId = data.meetingCode || name.replace('spaces/', '');

  return {
    spaceId,
    meetingUrl,
    name,
  };
}

/**
 * Retrieves an existing Google Meet space by its resource name.
 */
export async function getMeetSpace(
  spaceName: string
): Promise<{ spaceId: string; meetingUrl: string; activeConferenceId?: string }> {
  if (!isMeetConfigured()) {
    throw new MeetConfigError();
  }

  const token = await getAccessToken();
  const formattedName = spaceName.startsWith('spaces/') ? spaceName : `spaces/${spaceName}`;

  const res = await fetch(`https://meet.googleapis.com/v2/${formattedName}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    if (res.status === 401 || res.status === 403) {
      throw new MeetAuthError(`Google API unauthorized: ${errorText}`);
    }
    throw new MeetSpaceError(`Failed to get Meet space ${spaceName}: ${errorText}`);
  }

  const data = await res.json();
  const name = data.name;
  const meetingUrl = data.meetingUri || `https://meet.google.com/${data.meetingCode || name.replace('spaces/', '')}`;
  const spaceId = data.meetingCode || name.replace('spaces/', '');

  return {
    spaceId,
    meetingUrl,
    activeConferenceId: data.activeConference?.conferenceRecord,
  };
}

/**
 * Lists participants in a conference record.
 */
export async function listParticipants(
  spaceName: string,
  conferenceId: string
): Promise<GoogleParticipant[]> {
  if (!isMeetConfigured()) {
    throw new MeetConfigError();
  }

  const token = await getAccessToken();
  const formattedConference = conferenceId.startsWith('conferenceRecords/')
    ? conferenceId
    : `conferenceRecords/${conferenceId}`;

  const res = await fetch(`https://meet.googleapis.com/v2/${formattedConference}/participants`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    meetLogger.error({ status: res.status, body: errorText }, 'Failed to list participants');
    if (res.status === 401 || res.status === 403) {
      throw new MeetAuthError(`Google API unauthorized: ${errorText}`);
    }
    throw new MeetSpaceError(`Failed to list participants: ${errorText}`);
  }

  const data = await res.json();
  return (data.participants || []) as GoogleParticipant[];
}

/**
 * Lists participant sessions (join and leave periods) for a participant.
 */
export async function listParticipantSessions(
  participantName: string
): Promise<GoogleParticipantSession[]> {
  if (!isMeetConfigured()) {
    throw new MeetConfigError();
  }

  const token = await getAccessToken();

  const res = await fetch(`https://meet.googleapis.com/v2/${participantName}/participantSessions`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    meetLogger.error({ status: res.status, body: errorText }, 'Failed to list participant sessions');
    if (res.status === 401 || res.status === 403) {
      throw new MeetAuthError(`Google API unauthorized: ${errorText}`);
    }
    throw new MeetSpaceError(`Failed to list participant sessions: ${errorText}`);
  }

  const data = await res.json();
  return (data.participantSessions || []) as GoogleParticipantSession[];
}

/**
 * Gets a transcript by resource name.
 */
export async function getTranscript(
  transcriptName: string
): Promise<GoogleTranscript | null> {
  if (!isMeetConfigured()) {
    throw new MeetConfigError();
  }

  const token = await getAccessToken();

  const res = await fetch(`https://meet.googleapis.com/v2/${transcriptName}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    const errorText = await res.text();
    if (res.status === 401 || res.status === 403) {
      throw new MeetAuthError(`Google API unauthorized: ${errorText}`);
    }
    throw new MeetSpaceError(`Failed to get transcript: ${errorText}`);
  }

  return (await res.json()) as GoogleTranscript;
}

/**
 * Lists entries of a transcript.
 */
export async function listTranscriptEntries(
  transcriptName: string
): Promise<GoogleTranscriptEntry[]> {
  if (!isMeetConfigured()) {
    throw new MeetConfigError();
  }

  const token = await getAccessToken();

  const res = await fetch(`https://meet.googleapis.com/v2/${transcriptName}/entries`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    if (res.status === 401 || res.status === 403) {
      throw new MeetAuthError(`Google API unauthorized: ${errorText}`);
    }
    throw new MeetSpaceError(`Failed to list transcript entries: ${errorText}`);
  }

  const data = await res.json();
  return (data.transcriptEntries || []) as GoogleTranscriptEntry[];
}

