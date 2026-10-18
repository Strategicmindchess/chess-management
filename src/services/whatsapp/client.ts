// Standalone client compatible with both Next.js Server and BullMQ Background Workers
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

  // 1. Determine named vs positional parameter mappings
  const NAMED_TEMPLATES: Record<string, string[]> = {
    smc_class_reminder: ['student_name', 'batch_name', 'class_date', 'class_time', 'class_link'],
    smc_holiday: ['holiday_name', 'start_date'],
    smc_class_cancelled: ['batch_name', 'time'],
    smc_tournament: ['tournament_name', 'tournament_type', 'tournament_date', 'tournament_time', 'registration_link'],
  };

  const isKnownNamed = !!NAMED_TEMPLATES[payload.templateName];

  // Map values
  const paramMap: Record<string, string> = {};
  if (payload.namedParams) {
    Object.assign(paramMap, payload.namedParams);
  }

  if (payload.templateName === 'smc_class_reminder') {
    if (!paramMap.student_name && payload.templateParams?.[0]) paramMap.student_name = payload.templateParams[0];
    if (!paramMap.batch_name && payload.templateParams?.[1]) paramMap.batch_name = payload.templateParams[1];
    if (!paramMap.class_date && payload.templateParams?.[2]) paramMap.class_date = payload.templateParams[2];
    if (!paramMap.class_time && payload.templateParams?.[3]) paramMap.class_time = payload.templateParams[3];
    if (!paramMap.class_link && payload.templateParams?.[4]) paramMap.class_link = payload.templateParams[4];

    // Defaults
    paramMap.student_name = paramMap.student_name || 'Student';
    paramMap.batch_name = paramMap.batch_name || 'Special Batch';
    paramMap.class_date = paramMap.class_date || 'Today';
    paramMap.class_time = paramMap.class_time || '01:00 PM';
    paramMap.class_link = paramMap.class_link || 'https://meet.google.com/smc-chess-class';
  } else if (payload.templateName === 'smc_holiday') {
    if (!paramMap.holiday_name && payload.templateParams?.[0]) paramMap.holiday_name = payload.templateParams[0];
    if (!paramMap.start_date && payload.templateParams?.[1]) paramMap.start_date = payload.templateParams[1];
    paramMap.holiday_name = paramMap.holiday_name || 'Academy Break';
    paramMap.start_date = paramMap.start_date || 'Upcoming';
  } else if (payload.templateName === 'smc_class_cancelled') {
    if (!paramMap.batch_name && payload.templateParams?.[0]) paramMap.batch_name = payload.templateParams[0];
    if (!paramMap.time && payload.templateParams?.[1]) paramMap.time = payload.templateParams[1];
    paramMap.batch_name = paramMap.batch_name || 'Chess Batch';
    paramMap.time = paramMap.time || 'Today';
  } else if (payload.templateName === 'smc_tournament') {
    if (!paramMap.tournament_name && payload.templateParams?.[0]) paramMap.tournament_name = payload.templateParams[0];
    if (!paramMap.tournament_date && payload.templateParams?.[1]) paramMap.tournament_date = payload.templateParams[1];
    if (!paramMap.tournament_time && payload.templateParams?.[2]) paramMap.tournament_time = payload.templateParams[2];
    if (!paramMap.tournament_type && payload.templateParams?.[3]) paramMap.tournament_type = payload.templateParams[3];
    if (!paramMap.registration_link && payload.templateParams?.[4]) paramMap.registration_link = payload.templateParams[4];
    paramMap.tournament_name = paramMap.tournament_name || 'SMC Tournament';
    paramMap.tournament_type = paramMap.tournament_type || 'Rapid';
    paramMap.tournament_date = paramMap.tournament_date || 'Sunday';
    paramMap.tournament_time = paramMap.tournament_time || '10:00 AM';
    paramMap.registration_link = paramMap.registration_link || 'https://lichess.org/tournament/smc2026';
  } else if (payload.templateParams) {
    payload.templateParams.forEach((val, idx) => {
      paramMap[`param_${idx + 1}`] = val;
    });
  }

  // Builder for named or positional
  const buildComponents = (useNamed: boolean) => {
    if (useNamed && isKnownNamed) {
      const keys = NAMED_TEMPLATES[payload.templateName] || Object.keys(paramMap);
      return [
        {
          type: "body",
          parameters: keys.map((key) => ({
            type: "text",
            parameter_name: key,
            text: String(paramMap[key] ?? ""),
          })),
        },
      ];
    } else {
      // Positional
      const values = isKnownNamed
        ? (NAMED_TEMPLATES[payload.templateName] || []).map((k) => paramMap[k] ?? '')
        : Object.values(paramMap);

      if (values.length === 0) return [];
      return [
        {
          type: "body",
          parameters: values.map((text) => ({
            type: "text",
            text: String(text ?? ""),
          })),
        },
      ];
    }
  };

  const primaryLang = payload.languageCode || process.env.WHATSAPP_TEMPLATE_LANG || "en";

  const buildBody = (lang: string, useNamed: boolean) => ({
    messaging_product: "whatsapp",
    to: payload.to,
    type: "template",
    template: {
      name: payload.templateName,
      language: {
        code: lang
      },
      components: buildComponents(useNamed),
    }
  });

  // Start with named if it's a known named template
  let currentUseNamed = isKnownNamed;
  let requestBody = buildBody(primaryLang, currentUseNamed);
  console.log(`[WhatsApp:send] Sending "${payload.templateName}" to ${payload.to} with lang "${primaryLang}" (named=${currentUseNamed}):`, JSON.stringify(requestBody, null, 2));

  let res = await fetch(BASE_URL, {
    method:  'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ACCESS_TOKEN}`
    },
    body:    JSON.stringify(requestBody),
  });

  let resText = await res.text();

  // If Meta failed due to parameter name issue ("Parameter name is missing" or "#132000"), flip format and retry immediately
  if (!res.ok && (resText.includes('Parameter name is missing') || resText.includes('132000') || resText.includes('localizable_params'))) {
    currentUseNamed = !currentUseNamed;
    console.warn(`[WhatsApp] Parameter format mismatch. Retrying with named=${currentUseNamed}...`);
    requestBody = buildBody(primaryLang, currentUseNamed);
    res = await fetch(BASE_URL, {
      method:  'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      },
      body:    JSON.stringify(requestBody),
    });
    resText = await res.text();
  }

  if (res.ok) {
    console.log(`[WhatsApp:success] Sent "${payload.templateName}" to ${payload.to}:`, resText);
    let messageId: string | undefined;
    try {
      const parsed = JSON.parse(resText);
      messageId = parsed.messages?.[0]?.id;
    } catch (_) {}

    if (messageId) {
      try {
        const { prisma } = await import('@/lib/prisma');
        const preview = payload.namedParams
          ? (payload.templateName === 'smc_class_reminder'
              ? `Reminder: Class for batch "${payload.namedParams.batch_name || ''}" on ${payload.namedParams.class_date || ''} at ${payload.namedParams.class_time || ''}. Link: ${payload.namedParams.class_link || ''}`
              : `Template: ${payload.templateName} (${Object.values(payload.namedParams).join(', ')})`)
          : `Template: ${payload.templateName} sent`;

        await (prisma as any).whatsAppMessageLog.upsert({
          where: { wamid: messageId },
          create: {
            wamid: messageId,
            recipientPhone: payload.to,
            recipientName: payload.namedParams?.student_name || 'Recipient',
            templateName: payload.templateName,
            templateCategory: 'UTILITY',
            templateParams: payload.namedParams || payload.templateParams,
            previewText: preview,
            status: 'SENT',
          },
          update: {
            status: 'SENT',
          },
        });
      } catch (err: any) {
        console.warn('[WhatsApp DB Log Error]:', err.message);
      }
    }

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
        body:    JSON.stringify(buildBody(fallbackLang, currentUseNamed)),
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
