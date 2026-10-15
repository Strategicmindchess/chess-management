import { NextRequest, NextResponse } from 'next/server';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'smc_secret_webhook_verify_token_2026';

export interface WhatsAppStatusItem {
  id: string; // wamid
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: Array<{
    code: number;
    title: string;
    message?: string;
    error_data?: {
      details?: string;
    };
  }>;
}

/**
 * Handles Meta GET verification handshake for Webhooks
 */
export function handleWhatsAppVerification(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  console.log('[WhatsApp Webhook:Verification]', { mode, token, challengeProvided: !!challenge });

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ [WhatsApp Webhook] Verification successful!');
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  console.warn('❌ [WhatsApp Webhook] Verification failed. Token mismatch or invalid mode.');
  return new Response('Forbidden', { status: 403 });
}

/**
 * Handles Meta POST webhook events (delivery statuses, message receipts, errors)
 */
export async function handleWhatsAppWebhookEvent(req: NextRequest) {
  try {
    const body = await req.json();
    try {
      const fs = await import('fs');
      fs.appendFileSync('logs/webhook.log', `[${new Date().toISOString()}] RAW EVENT: ${JSON.stringify(body)}\n`);
    } catch (_) {}

    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value || {};

          // 1. Delivery Statuses (sent, delivered, read, failed)
          if (value.statuses && Array.isArray(value.statuses)) {
            for (const status of value.statuses as WhatsAppStatusItem[]) {
              const statusLine = `[${new Date().toISOString()}] ID: ${status.id} | Status: ${status.status.toUpperCase()} | Recipient: ${status.recipient_id} | Errors: ${JSON.stringify(status.errors || [])}\n`;
              try {
                const fs = await import('fs');
                fs.appendFileSync('logs/webhook.log', statusLine);
              } catch (_) {}

              console.log(`\n📬 [WhatsApp Status Update] Message ID: ${status.id}`);
              console.log(`   Status:       ${status.status.toUpperCase()}`);
              console.log(`   Recipient:    ${status.recipient_id}`);
              console.log(`   Timestamp:    ${new Date(Number(status.timestamp) * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);

              if (status.errors && status.errors.length > 0) {
                console.error(`   ❌ Delivery Error:`, JSON.stringify(status.errors, null, 2));
              }
            }
          }

          // 2. Incoming Messages (Customer replies)
          if (value.messages && Array.isArray(value.messages)) {
            for (const msg of value.messages) {
              console.log(`\n💬 [WhatsApp Incoming Message] From: ${msg.from}`);
              console.log(`   Type: ${msg.type}`);
              if (msg.text) {
                console.log(`   Text: "${msg.text.body}"`);
              }
            }
          }

          // 3. Account / System Errors
          if (value.errors && Array.isArray(value.errors)) {
            for (const err of value.errors) {
              console.error(`\n⚠️ [WhatsApp Account Error]:`, JSON.stringify(err, null, 2));
            }
          }
        }
      }
    }

    // Meta requires an immediate HTTP 200 OK acknowledgment
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('[WhatsApp Webhook:Error]', error);
    // Still return 200 to prevent Meta from spamming retries for unparseable bodies
    return NextResponse.json({ success: false, error: error.message }, { status: 200 });
  }
}
