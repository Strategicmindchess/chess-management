# Google Meet Integration — Production Deployment Guide

This guide details the step-by-step instructions to configure Google Cloud Workspace credentials, Pub/Sub event streaming, environment variables, and background workers in production.

---

## 1. Google Cloud Platform Setup

### 1.1 Enable Required APIs
In your Google Cloud Console (`console.cloud.google.com`):
1. Navigate to **APIs & Services > Library**.
2. Search for and enable:
   - **Google Meet API** (`meet.googleapis.com`)
   - **Google Drive API** (`drive.googleapis.com`)
   - **Google Docs API** (`docs.googleapis.com`)

### 1.2 Create Service Account
1. Go to **IAM & Admin > Service Accounts**.
2. Click **Create Service Account**:
   - Name: `smc-meet-integration`
   - Description: `Service account for SMC Google Meet room provisioning and event ingestion`
3. Click **Create and Continue**, then grant role **Project Viewer** (or leave without project roles if using Domain-Wide Delegation).
4. Click on the created service account, go to the **Keys** tab, and click **Add Key > Create new key > JSON**.
5. Save the downloaded JSON file. You will minify and set this as `GOOGLE_MEET_CREDENTIALS_JSON`.

### 1.3 Google Workspace Domain-Wide Delegation (Required for Service Accounts)
If using a Google Workspace account (recommended for managing academy calendar/meet spaces):
1. In Google Cloud Console, copy the Service Account's **Client ID** (OAuth 2 Client ID).
2. Open Google Workspace Admin Console (`admin.google.com`).
3. Navigate to **Security > Access and data control > API controls > Manage Domain-Wide Delegation**.
4. Click **Add new**:
   - Client ID: `<Service Account Client ID>`
   - OAuth scopes (comma-separated):
     ```
     https://www.googleapis.com/auth/meetings.space.created,
     https://www.googleapis.com/auth/meetings.space.readonly,
     https://www.googleapis.com/auth/drive.readonly,
     https://www.googleapis.com/auth/documents.readonly
     ```
5. Click **Authorize**.

---

## 2. Google Cloud Pub/Sub Setup

To receive real-time events when classes start, end, or participants join:

### 2.1 Create Pub/Sub Topic
1. Go to **Pub/Sub > Topics** in Google Cloud Console.
2. Click **Create Topic**:
   - Topic ID: `meet-events` (e.g. `projects/smc-production/topics/meet-events`)

### 2.2 Configure Workspace Event Subscription (Google Meet API)
Google Meet v2 supports Cloud Pub/Sub notifications:
1. Register a Google Workspace Event subscription using the Google Meet API v2 or Cloud Console targeting the topic `projects/smc-production/topics/meet-events`.

### 2.3 Create Pub/Sub Push Subscription
1. Inside the topic `meet-events`, click **Create Subscription**.
2. Subscription details:
   - Subscription ID: `meet-events-push`
   - Delivery Type: **Push**
   - Endpoint URL: `https://<YOUR_PRODUCTION_DOMAIN>/api/webhooks/google-meet`
   - **Enable Authentication**:
     - Check **Enable Authentication**.
     - Service account: Use `smc-meet-integration` or default App Engine / Compute account.
     - Audience: `https://<YOUR_PRODUCTION_DOMAIN>/api/webhooks/google-meet`
   - Acknowledgment deadline: **60 seconds**.
   - Retry Policy: **Retry after exponential backoff** (minimum 10s, maximum 600s).

---

## 3. Environment Variables

Add the following environment variables to your deployment environment (e.g. Railway, Vercel, or `.env.production`):

| Variable Name | Required | Description | Example |
|---|---|---|---|
| `GOOGLE_MEET_CREDENTIALS_JSON` | **Yes** | Minified JSON string of Google service account key or OAuth credentials | `{"type":"service_account","project_id":...}` |
| `GOOGLE_WORKSPACE_EMAIL` | **Yes** | Primary Workspace admin or coach user email to impersonate | `coaching@strategicmindchess.com` |
| `GOOGLE_PUBSUB_TOPIC` | Optional | Google Pub/Sub topic string | `projects/smc-production/topics/meet-events` |
| `GOOGLE_PUBSUB_SUBSCRIPTION` | Optional | Google Pub/Sub subscription string | `projects/smc-production/subscriptions/meet-events-push` |
| `GOOGLE_PUBSUB_AUDIENCE` | Recommended | Expected audience in OIDC token pushed by Google Pub/Sub | `https://smc-chess.up.railway.app/api/webhooks/google-meet` |
| `MEET_WEBHOOK_SECRET` | Optional | Shared secret for custom signature validation | `random-secret-key-64-bytes` |
| `MEET_SPACE_EXPIRY_DAYS` | Optional | Number of days before temporary space expires (default: `1`) | `1` |

---

## 4. Database Migration

Run the provided DDL script against your production PostgreSQL database before starting the workers:
```bash
psql $DATABASE_URL -f prisma/migrations/new_meeting_tables.sql
```
*(Alternatively, copy and paste the contents of `prisma/migrations/new_meeting_tables.sql` into the Railway Postgres Query tab).*

---

## 5. Background Workers & PM2 / Railway Deployment

The background workers are integrated into `worker.ts` and managed via `ecosystem.config.js`.

### Railway / Server Setup:
Ensure the worker process is running alongside the web service:
```bash
# Start background worker daemon
npm run worker
```

The worker automatically initializes:
- `meet-event` worker (processes Pub/Sub events)
- `meet-recording` worker (transfers Drive videos to S3)
- `meet-reconciliation` worker (runs repeatable cron every 5 minutes)

All queues are registered with graceful shutdown hooks (`SIGINT` / `SIGTERM`) to ensure zero dropped jobs during rolling updates.

