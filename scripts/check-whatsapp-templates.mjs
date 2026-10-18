import fs from 'fs';
import path from 'path';

// Parse .env manually
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
const phoneId = env.WHATSAPP_PHONE_NUMBER_ID;
const version = env.WHATSAPP_API_VERSION || 'v21.0';

async function check() {
  console.log(`Checking WhatsApp Phone ID: ${phoneId}...`);
  // 1. Get WABA ID
  const phoneRes = await fetch(`https://graph.facebook.com/${version}/${phoneId}?fields=whatsapp_business_account,display_phone_number,verified_name`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const phoneData = await phoneRes.json();
  console.log('Phone details:', phoneData);

  const wabaId = phoneData?.whatsapp_business_account?.id;
  if (!wabaId) {
    console.error('Could not find WABA ID from phone number');
    return;
  }

  console.log(`Fetching templates for WABA ID: ${wabaId}...`);
  const tplRes = await fetch(`https://graph.facebook.com/${version}/${wabaId}/message_templates?limit=100`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const tplData = await tplRes.json();
  if (tplData.error) {
    console.error('Error fetching templates:', tplData.error);
    return;
  }

  console.log(`\nFound ${tplData.data?.length || 0} templates:`);
  for (const tpl of tplData.data || []) {
    console.log(`-----------------------------------`);
    console.log(`Name: ${tpl.name}`);
    console.log(`Language: ${tpl.language}`);
    console.log(`Status: ${tpl.status}`);
    console.log(`Category: ${tpl.category}`);
    console.log(`Components:`, JSON.stringify(tpl.components, null, 2));
  }
}

check().catch(console.error);
