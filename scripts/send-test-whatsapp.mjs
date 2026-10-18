import fs from 'fs';
import path from 'path';

// 1. Read .env file
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value.trim();
  }
}

const ACCESS_TOKEN = env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = env.WHATSAPP_PHONE_NUMBER_ID;
const API_VERSION = env.WHATSAPP_API_VERSION || 'v21.0';

if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
  console.error('❌ Error: WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID missing in .env');
  process.exit(1);
}

// 2. Parse command line arguments
// Usage: node scripts/send-test-whatsapp.mjs [phone] [template]
const targetPhone = process.argv[2] || '919305302337';
const templateName = process.argv[3] || 'smc_tournament';

// Clean phone to E.164 without '+' or leading '0'
function sanitizePhone(raw) {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1);
  }
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.startsWith('91') && digits.length === 12) {
    return digits;
  }
  return digits.length > 10 ? `91${digits.slice(-10)}` : `91${digits}`;
}

const toPhone = sanitizePhone(targetPhone);

// 3. Define components based on template
let components = [];
if (templateName === 'smc_tournament') {
  components = [
    {
      type: 'body',
      parameters: [
        { type: 'text', parameter_name: 'tournament_name', text: 'SMC Rapid Championship' },
        { type: 'text', parameter_name: 'tournament_type', text: 'Rapid (15+10)' },
        { type: 'text', parameter_name: 'tournament_date', text: '18 Oct 2026' },
        { type: 'text', parameter_name: 'tournament_time', text: '10:00 AM' },
        { type: 'text', parameter_name: 'registration_link', text: 'https://strategicmindchess.com' }
      ]
    }
  ];
} else if (templateName === 'smc_holiday') {
  components = [
    {
      type: 'body',
      parameters: [
        { type: 'text', parameter_name: 'holiday_name', text: 'Diwali Break' },
        { type: 'text', parameter_name: 'start_date', text: '20 Oct 2026' }
      ]
    }
  ];
} else if (templateName === 'smc_class_reminder') {
  components = [
    {
      type: 'body',
      parameters: [
        { type: 'text', parameter_name: 'student_name', text: 'Champion' },
        { type: 'text', parameter_name: 'batch_name', text: 'Grandmasters A1' },
        { type: 'text', parameter_name: 'class_date', text: '14 Oct 2026' },
        { type: 'text', parameter_name: 'class_time', text: '05:00 PM' },
        { type: 'text', parameter_name: 'class_link', text: 'https://meet.google.com/abc-defg-hij' }
      ]
    }
  ];
} else if (templateName === 'smc_class_cancelled') {
  components = [
    {
      type: 'body',
      parameters: [
        { type: 'text', parameter_name: 'batch_name', text: 'Grandmasters A1' },
        { type: 'text', parameter_name: 'time', text: '14 Oct 2026 at 05:00 PM' }
      ]
    }
  ];
} else if (templateName === 'hello_world') {
  components = []; // default Meta hello_world requires no components
}

const payload = {
  messaging_product: 'whatsapp',
  to: toPhone,
  type: 'template',
  template: {
    name: templateName,
    language: {
      code: templateName === 'hello_world' ? 'en_US' : 'en'
    },
    ...(components.length > 0 ? { components } : {})
  }
};

const url = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`;

console.log('\n======================================================');
console.log('🚀 Sending WhatsApp Test Message via Meta Cloud API');
console.log('======================================================');
console.log(`URL:         ${url}`);
console.log(`To Phone:    ${toPhone}`);
console.log(`Template:    ${templateName}`);
console.log('Payload Body:\n', JSON.stringify(payload, null, 2));
console.log('------------------------------------------------------');

async function send() {
  const startTime = Date.now();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ACCESS_TOKEN}`
    },
    body: JSON.stringify(payload)
  });

  const duration = Date.now() - startTime;
  const status = res.status;
  const resData = await res.json();

  console.log(`HTTP Status: ${status} (${duration}ms)`);
  console.log('Meta Response:\n', JSON.stringify(resData, null, 2));
  console.log('======================================================');

  if (res.ok) {
    console.log('✅ SUCCESS: Meta accepted the message!');
    console.log(`Message ID: ${resData.messages?.[0]?.id}`);
    console.log('\n📱 Phone pe check karein:');
    console.log('1. Agar WhatsApp message aa gaya: Sab ready hai! 🎉');
    console.log('2. Agar message nahi aaya lekin Meta ne success return kiya:');
    console.log('   - Check karein Meta Business Manager me Billing / Card add hai ya nahi.');
    console.log('   - Check karein Meta App "Development" mode me hai toh recipient number "To test numbers" me verified hai ya nahi.');
    console.log('   - Check karein ki is number par pehle koi message block ya reported toh nahi hua.');
  } else {
    console.error('❌ FAILED: Meta rejected the message.');
    const code = resData.error?.code;
    const msg = resData.error?.message;
    console.error(`Error Code: ${code} - ${msg}`);

    if (code === 131030) {
      console.log('👉 Reason: Meta App is in Development mode. Add this phone number to "Manage phone number list" in developers.facebook.com');
    } else if (code === 132001) {
      console.log('👉 Reason: Template name or translation does not exist in requested language.');
    } else if (code === 132000) {
      console.log('👉 Reason: Parameter count or parameter names mismatch with template definition.');
    } else if (code === 131042) {
      console.log('👉 Reason: Payment method issue / Payment account not attached in Meta Business Manager.');
    } else if (code === 190) {
      console.log('👉 Reason: Access token expired or invalid.');
    }
  }
}

send().catch(err => {
  console.error('Network or Execution Error:', err);
});
