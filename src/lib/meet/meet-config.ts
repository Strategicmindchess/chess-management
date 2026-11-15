/**
 * Google Meet Integration Configuration
 * Centralised environment variable parsing, validation, and feature flagging.
 */

export interface GoogleMeetConfig {
  credentialsJson: string | null;
  workspaceEmail: string | null;
  pubsubTopic: string | null;
  pubsubSubscription: string | null;
  pubsubAudience: string | null;
  webhookSecret: string | null;
  spaceExpiryDays: number;
}

export function getMeetConfig(): GoogleMeetConfig {
  return {
    credentialsJson: process.env.GOOGLE_MEET_CREDENTIALS_JSON || null,
    workspaceEmail: process.env.GOOGLE_WORKSPACE_EMAIL || null,
    pubsubTopic: process.env.GOOGLE_PUBSUB_TOPIC || null,
    pubsubSubscription: process.env.GOOGLE_PUBSUB_SUBSCRIPTION || null,
    pubsubAudience: process.env.GOOGLE_PUBSUB_AUDIENCE || null,
    webhookSecret: process.env.MEET_WEBHOOK_SECRET || null,
    spaceExpiryDays: parseInt(process.env.MEET_SPACE_EXPIRY_DAYS || '1', 10) || 1,
  };
}

/**
 * Returns true if Google Meet integration has the necessary credentials configured.
 * Requires at least GOOGLE_MEET_CREDENTIALS_JSON or (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET).
 */
export function isMeetConfigured(): boolean {
  const config = getMeetConfig();
  if (config.credentialsJson) {
    return true;
  }
  // Fallback to Google OAuth credentials if configured
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    return true;
  }
  return false;
}

