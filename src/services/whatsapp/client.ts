import 'server-only';

const ACCESS_TOKEN    = process.env.WHATSAPP_ACCESS_TOKEN ?? '';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID ?? '';
const API_VERSION     = process.env.WHATSAPP_API_VERSION ?? 'v21.0';

const BASE_URL = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`;

export interface SendWhatsAppPayload {
  to: string;            // E.164 e.g. "919876543210"
  templateName: string;
  templateParams: string[]; // Simple array of strings for body parameters
}

export async function sendWhatsAppMessage(payload: SendWhatsAppPayload): Promise<void> {
  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    // Dev fallback: just log
    console.log('[WhatsApp:dev]', payload.templateName, payload.to, payload.templateParams);
    return;
  }

  // Meta Cloud API expects a specific structure for template parameters.
  // We'll map the simple string array to Meta's body parameters format.
  const components = payload.templateParams.length > 0 ? [
    {
      type: "body",
      parameters: payload.templateParams.map(text => ({ type: "text", text }))
    }
  ] : [];

  const body = {
    messaging_product: "whatsapp",
    to: payload.to,
    type: "template",
    template: {
      name: payload.templateName,
      language: {
        code: "en" // Adjust based on your approved templates (e.g., en_US, hi)
      },
      components
    }
  };

  const res = await fetch(BASE_URL, {
    method:  'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ACCESS_TOKEN}`
    },
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Meta API error ${res.status}: ${await res.text()}`);
  }
}
