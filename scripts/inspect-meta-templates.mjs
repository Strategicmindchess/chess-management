import fs from 'fs';
import path from 'path';

// Read .env
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)?\s*$/);
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

async function check() {
  // Query phone number fields
  const phoneRes = await fetch(`https://graph.facebook.com/v21.0/${phoneId}?fields=id,display_phone_number,name_status`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const phoneData = await phoneRes.json();
  console.log('Phone detail:', phoneData);

  // Let's test calling Meta with positional parameters for smc_class_reminder!
  // Positional parameters test payload
  const positionalBody = {
    messaging_product: "whatsapp",
    to: "919305302337",
    type: "template",
    template: {
      name: "smc_class_reminder",
      language: { code: "en" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: "Shivam Gupta" },
            { type: "text", text: "Special Batch (42XK)" },
            { type: "text", text: "18 Oct" },
            { type: "text", text: "01:00 PM" },
            { type: "text", text: "https://meet.google.com/smc-chess-class" }
          ]
        }
      ]
    }
  };

  console.log('Testing positional parameters dispatch...');
  const sendRes = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(positionalBody)
  });

  const sendStatus = sendRes.status;
  const sendText = await sendRes.text();
  console.log(`Positional params result (${sendStatus}):`, sendText);

  // Also test named parameters dispatch to compare
  const namedBody = {
    messaging_product: "whatsapp",
    to: "919305302337",
    type: "template",
    template: {
      name: "smc_class_reminder",
      language: { code: "en" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", parameter_name: "student_name", text: "Shivam Gupta" },
            { type: "text", parameter_name: "batch_name", text: "Special Batch (42XK)" },
            { type: "text", parameter_name: "class_date", text: "18 Oct" },
            { type: "text", parameter_name: "class_time", text: "01:00 PM" },
            { type: "text", parameter_name: "class_link", text: "https://meet.google.com/smc-chess-class" }
          ]
        }
      ]
    }
  };

  console.log('Testing named parameters dispatch...');
  const sendRes2 = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(namedBody)
  });

  console.log(`Named params result (${sendRes2.status}):`, await sendRes2.text());
}

check().catch(console.error);
