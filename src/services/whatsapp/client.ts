import 'server-only';

const ACCESS_TOKEN    = process.env.WHATSAPP_ACCESS_TOKEN ?? '';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID ?? '';
const API_VERSION     = process.env.WHATSAPP_API_VERSION ?? 'v21.0';

const BASE_URL = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`;

export interface SendWhatsAppPayload {
  to: string;            // E.164 e.g. "919876543210"
  templateName: string;
  templateParams?: string[]; // Positional parameters array
  namedParams?: Record<string, string>; // Named parameters object e.g. { student_name: "Rahul", batch_name: "Alpha" }
  languageCode?: string;
}

export async function sendWhatsAppMessage(payload: SendWhatsAppPayload): Promise<{ success: boolean; messageId?: string }> {
  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    // Dev fallback: just log
    console.log('[WhatsApp:dev]', payload.templateName, payload.to, payload.namedParams || payload.templateParams);
    return { success: true, messageId: `dev_${Date.now()}` };
  }

  // Meta Cloud API supports both named parameters and positional parameters:
  let components: any[] = [];

  if (payload.namedParams && Object.keys(payload.namedParams).length > 0) {
    components = [
      {
        type: "body",
        parameters: Object.entries(payload.namedParams).map(([paramName, text]) => ({
          type: "text",
          parameter_name: paramName,
          text: String(text ?? "")
        }))
      }
    ];
  } else if (payload.templateParams && payload.templateParams.length > 0) {
    let mappedNamed: Record<string, string> | null = null;

    if (payload.templateName === 'smc_class_reminder') {
      mappedNamed = payload.templateParams.length === 4
        ? {
            student_name: 'Student',
            batch_name: payload.templateParams[0] || '',
            class_date: payload.templateParams[1] || '',
            class_time: payload.templateParams[2] || '',
            class_link: payload.templateParams[3] || '',
          }
        : {
            student_name: payload.templateParams[0] || 'Student',
            batch_name: payload.templateParams[1] || '',
            class_date: payload.templateParams[2] || '',
            class_time: payload.templateParams[3] || '',
            class_link: payload.templateParams[4] || '',
          };
    } else if (payload.templateName === 'smc_holiday') {
      mappedNamed = {
        holiday_name: payload.templateParams[0] || '',
        start_date: payload.templateParams[1] || '',
      };
    } else if (payload.templateName === 'smc_class_cancelled') {
      mappedNamed = {
        batch_name: payload.templateParams[0] || '',
        time: payload.templateParams[1] || '',
      };
    } else if (payload.templateName === 'smc_tournament') {
      // payload.templateParams: [tournamentName, dateStr, time, tournamentType, registrationLink]
      mappedNamed = {
        tournament_name: payload.templateParams[0] || '',
        tournament_type: payload.templateParams[3] || '',
        tournament_date: payload.templateParams[1] || '',
        tournament_time: payload.templateParams[2] || '',
        registration_link: payload.templateParams[4] || '',
      };
    }

    if (mappedNamed) {
      components = [
        {
          type: "body",
          parameters: Object.entries(mappedNamed).map(([paramName, text]) => ({
            type: "text",
            parameter_name: paramName,
            text: String(text ?? "")
          }))
        }
      ];
    } else {
      components = [
        {
          type: "body",
          parameters: payload.templateParams.map(text => ({ type: "text", text: String(text ?? "") }))
        }
      ];
    }
  }

  const primaryLang = payload.languageCode || process.env.WHATSAPP_TEMPLATE_LANG || "en";

  const buildBody = (lang: string) => ({
    messaging_product: "whatsapp",
    to: payload.to,
    type: "template",
    template: {
      name: payload.templateName,
      language: {
        code: lang
      },
      components
    }
  });

  const requestBody = buildBody(primaryLang);
  console.log(`[WhatsApp:send] Sending "${payload.templateName}" to ${payload.to} with lang "${primaryLang}":`, JSON.stringify(requestBody, null, 2));

  let res = await fetch(BASE_URL, {
    method:  'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ACCESS_TOKEN}`
    },
    body:    JSON.stringify(requestBody),
  });

  const resText = await res.text();

  if (res.ok) {
    console.log(`[WhatsApp:success] Sent "${payload.templateName}" to ${payload.to}:`, resText);
    let messageId: string | undefined;
    try {
      const parsed = JSON.parse(resText);
      messageId = parsed.messages?.[0]?.id;
    } catch (_) {}
    return { success: true, messageId };
  }

  let errorText = resText;
  console.warn(`[WhatsApp:error] Meta API returned ${res.status} for "${payload.templateName}" (${primaryLang}):`, errorText);

  // If template does not exist in translated language (error code 132001), try fallback languages
  if (errorText.includes('132001') || errorText.includes('translated language')) {
    const candidates = ['en', 'en_US', 'en_GB'].filter(l => l !== primaryLang);
    for (const fallbackLang of candidates) {
      console.warn(`[WhatsApp] Retrying template ${payload.templateName} with language "${fallbackLang}"...`);
      const retryRes = await fetch(BASE_URL, {
        method:  'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ACCESS_TOKEN}`
        },
        body:    JSON.stringify(buildBody(fallbackLang)),
      });
      const retryText = await retryRes.text();
      if (retryRes.ok) {
        console.log(`[WhatsApp:success] Sent "${payload.templateName}" via fallback "${fallbackLang}":`, retryText);
        let messageId: string | undefined;
        try {
          const parsed = JSON.parse(retryText);
          messageId = parsed.messages?.[0]?.id;
        } catch (_) {}
        return { success: true, messageId };
      }
      errorText = retryText;
      console.warn(`[WhatsApp] Fallback "${fallbackLang}" failed:`, errorText);
    }
  }

  console.error(`Meta API error ${res.status}:`, errorText);
  throw new Error(`Meta API error: ${errorText}`);
}
