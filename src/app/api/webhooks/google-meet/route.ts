import { NextRequest, NextResponse } from 'next/server';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { getMeetConfig } from '@/lib/meet/meet-config';
import { meetLogger } from '@/lib/meet/meet-logger';
import { persistEvent } from '@/services/meet/meet-event.service';
import { meetEventQueue } from '@/workers/queue';

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const googleJwks = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const config = getMeetConfig();

  // 1. Verify Google Pub/Sub OIDC JWT if audience is configured
  if (config.pubsubAudience) {
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      meetLogger.warn('Missing or invalid Authorization header on Google Meet webhook');
      return NextResponse.json({ error: 'Unauthorized: Missing bearer token' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    try {
      await jwtVerify(token, googleJwks, {
        audience: config.pubsubAudience,
        issuer: 'https://accounts.google.com',
      });
    } catch (authErr) {
      meetLogger.error({ authErr }, 'Google Pub/Sub JWT verification failed');
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }
  }

  // 2. Parse body
  let body: any;
  try {
    body = await req.json();
  } catch (err) {
    meetLogger.error({ err }, 'Failed to parse JSON body from Google Meet webhook');
    return NextResponse.json({ error: 'Bad Request: Invalid JSON' }, { status: 400 });
  }

  // Pub/Sub Push format: { message: { data: "base64...", messageId: "...", attributes: {...} } }
  const message = body?.message;
  if (!message || !message.messageId) {
    meetLogger.warn({ body }, 'Received non-Pub/Sub webhook format');
    return NextResponse.json({ error: 'Bad Request: Missing Pub/Sub message structure' }, { status: 400 });
  }

  let decodedData: any = {};
  if (message.data) {
    try {
      const decodedString = Buffer.from(message.data, 'base64').toString('utf-8');
      decodedData = JSON.parse(decodedString);
    } catch (parseErr) {
      meetLogger.warn({ parseErr }, 'Could not decode message.data as JSON; using raw string');
      decodedData = { raw: message.data };
    }
  }

  const messageId = message.messageId;
  const eventType =
    message.attributes?.eventType ||
    decodedData?.eventType ||
    message.attributes?.['ce-type'] ||
    'google.workspace.meet.event';

  meetLogger.info(
    { messageId, eventType, publishTime: message.publishTime },
    'Received Google Meet Pub/Sub event'
  );

  // 3. Persist event durably in database
  let persistResult: { id: string; isDuplicate: boolean };
  try {
    persistResult = await persistEvent(messageId, eventType, decodedData);
  } catch (dbErr) {
    meetLogger.error({ dbErr, messageId }, 'Failed to persist MeetingEvent in database');
    // Return 200 to prevent unbounded Pub/Sub retry storms on DB error, or log critical
    return NextResponse.json({ status: 'PERSISTENCE_FAILED' }, { status: 200 });
  }

  const { id: meetingEventId, isDuplicate } = persistResult;

  if (isDuplicate) {
    return NextResponse.json(
      { status: 'ACKNOWLEDGED', duplicate: true, eventId: meetingEventId },
      { status: 200 }
    );
  }

  // 4. Enqueue background processing job
  try {
    await meetEventQueue.add(
      'process-meet-event',
      { meetingEventId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 10_000 },
        removeOnComplete: { age: 86400, count: 500 },
        removeOnFail: { age: 86400 * 3, count: 200 },
      }
    );
  } catch (queueErr) {
    meetLogger.error({ queueErr, meetingEventId }, 'Failed to enqueue meet event to BullMQ');
    // Still return 200 to satisfy Pub/Sub push SLA
  }

  return NextResponse.json({ status: 'ACKNOWLEDGED', eventId: meetingEventId }, { status: 200 });
}
