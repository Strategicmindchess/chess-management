import fs from 'fs';
import path from 'path';

// 1. Read .env
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

const token = env.WHATSAPP_ACCESS_TOKEN;
const phoneId = env.WHATSAPP_PHONE_NUMBER_ID || '1392089087319898';
const version = env.WHATSAPP_API_VERSION || 'v21.0';
const targetPhone = '919305302337';

const payload = {
  messaging_product: 'whatsapp',
  to: targetPhone,
  type: 'template',
  template: {
    name: 'smc_tournament',
    language: { code: 'en' },
    components: [
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
    ]
  }
};

async function main() {
  console.log('\n======================================================');
  console.log('🚀 Step 1: Sending message to Meta Cloud API...');
  console.log('======================================================');
  
  const res = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const resData = await res.json();
  const msgId = resData.messages?.[0]?.id;

  if (!msgId) {
    console.error('❌ Failed to send:', resData);
    return;
  }

  console.log(`✅ Message Accepted by Meta!`);
  console.log(`Message ID: ${msgId}`);
  console.log('\n======================================================');
  console.log('⏳ Step 2: Listening for Webhook status callback from Meta...');
  console.log('(Checking logs/webhook.log for delivery status)...');
  console.log('======================================================');

  const logFile = path.resolve(process.cwd(), 'logs/webhook.log');
  let found = false;

  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 2000));
    if (fs.existsSync(logFile)) {
      const content = fs.readFileSync(logFile, 'utf-8');
      if (content.includes(msgId)) {
        console.log('\n📬 WEBHOOK STATUS RECEIVED FROM META:\n');
        const lines = content.split('\n').filter(l => l.includes(msgId));
        lines.forEach(l => console.log(l));
        found = true;
        break;
      }
    }
    process.stdout.write('.');
  }

  if (!found) {
    console.log('\n\nℹ️ Webhook callback abhi tak nahi aaya.');
    console.log('Check karein:');
    console.log('1. Meta Developer Portal > WhatsApp > Configuration me Callback URL update hua hai:');
    console.log('   URL:   https://shadow-springer-downtown-realize.trycloudflare.com/webhooks/whatsapp');
    console.log('   Token: smc_secret_webhook_verify_token_2026');
    console.log('2. "messages" field Webhook fields table me Subscribed hai.');
  }
}

main().catch(console.error);
