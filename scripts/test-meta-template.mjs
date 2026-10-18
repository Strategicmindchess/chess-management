import fs from 'fs';
import path from 'path';

// Read .env
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
let token = '';
let phoneId = '';
for (const line of envContent.split('\n')) {
  const m1 = line.match(/^\s*WHATSAPP_ACCESS_TOKEN\s*=\s*(.*)?\s*$/);
  if (m1) token = m1[1].replace(/['"]/g, '').trim();
  const m2 = line.match(/^\s*WHATSAPP_PHONE_NUMBER_ID\s*=\s*(.*)?\s*$/);
  if (m2) phoneId = m2[1].replace(/['"]/g, '').trim();
}

async function main() {
  console.log('Querying Meta Graph API for templates...');
  // 1. Get WABA ID from Phone Number ID
  const phoneRes = await fetch(`https://graph.facebook.com/v21.0/${phoneId}?fields=display_phone_number,whatsapp_business_api_data`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Phone details:', await phoneRes.text());

  // 2. Query templates from WABA ID 1663021245172627
  const wabaId = '1663021245172627';
  const tRes = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/message_templates?limit=100`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const tData = await tRes.json();
  if (tData.data) {
    console.log(`Found ${tData.data.length} templates:`);
    for (const t of tData.data) {
      if (t.name.includes('smc_class_reminder') || t.name.includes('reminder')) {
        console.log('\n--- TEMPLATE:', t.name, '---');
        console.log(JSON.stringify(t, null, 2));
      }
    }
  } else {
    console.log('Templates response:', tData);
  }
}

main().catch(console.error);
