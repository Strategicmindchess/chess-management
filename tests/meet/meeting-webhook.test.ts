import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));

const { mockPrisma, mockMeetEventQueue, mockJwtVerify, configHolder } = vi.hoisted(() => {
  const mPrisma = {
    meetingEvent: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    meetingSession: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  };

  const mQueue = {
    add: vi.fn(),
  };

  const mJwt = vi.fn();

  const cHolder = {
    pubsubAudience: null as string | null,
  };

  return {
    mockPrisma: mPrisma,
    mockMeetEventQueue: mQueue,
    mockJwtVerify: mJwt,
    configHolder: cHolder,
  };
});

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

vi.mock('@/workers/queue', () => ({
  meetEventQueue: mockMeetEventQueue,
}));

vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(() => vi.fn()),
  jwtVerify: (...args: any[]) => mockJwtVerify(...args),
}));

vi.mock('@/lib/meet/meet-config', () => ({
  getMeetConfig: () => ({
    pubsubAudience: configHolder.pubsubAudience,
    credentialsJson: '{}',
    workspaceEmail: 'admin@smc.com',
    pubsubTopic: null,
    pubsubSubscription: null,
    webhookSecret: null,
    spaceExpiryDays: 1,
  }),
}));

import { POST } from '@/app/api/webhooks/google-meet/route';

describe('Google Meet Pub/Sub Webhook Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configHolder.pubsubAudience = null;
  });

  it('W1 — Rejects unauthenticated request when GOOGLE_PUBSUB_AUDIENCE is configured', async () => {
    configHolder.pubsubAudience = 'projects/smc/subscriptions/meet-push';

    const req = new NextRequest('http://localhost/api/webhooks/google-meet', {
      method: 'POST',
      body: JSON.stringify({ message: { data: 'e30=', messageId: 'msg-1' } }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('W2 — Validates and stores webhook event idempotently', async () => {
    // Already exists in DB
    mockPrisma.meetingEvent.findUnique.mockResolvedValue({
      id: 'evt-1',
      googleEventId: 'msg-123',
      status: 'PROCESSED',
    });

    const payload = {
      message: {
        messageId: 'msg-123',
        publishTime: new Date().toISOString(),
        data: Buffer.from(
          JSON.stringify({
            eventType: 'google.workspace.meet.conference.v1.started',
            conferenceRecord: 'spaces/abc/conferences/conf-1',
          })
        ).toString('base64'),
      },
    };

    const req = new NextRequest('http://localhost/api/webhooks/google-meet', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.duplicate).toBe(true);
    // Should NOT enqueue duplicate
    expect(mockMeetEventQueue.add).not.toHaveBeenCalled();
  });

  it('W3 — Enqueues new event for background processing', async () => {
    mockPrisma.meetingEvent.findUnique.mockResolvedValue(null);
    mockPrisma.meetingEvent.create.mockResolvedValue({
      id: 'db-evt-1',
      googleEventId: 'msg-new-456',
      status: 'PENDING',
    });

    const payload = {
      message: {
        messageId: 'msg-new-456',
        publishTime: new Date().toISOString(),
        data: Buffer.from(
          JSON.stringify({
            eventType: 'google.workspace.meet.conference.v1.ended',
            conferenceRecord: 'spaces/abc/conferences/conf-1',
          })
        ).toString('base64'),
      },
    };

    const req = new NextRequest('http://localhost/api/webhooks/google-meet', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.eventId).toBe('db-evt-1');
    expect(mockMeetEventQueue.add).toHaveBeenCalledWith(
      'process-meet-event',
      expect.objectContaining({ meetingEventId: 'db-evt-1' }),
      expect.any(Object)
    );
  });
});
