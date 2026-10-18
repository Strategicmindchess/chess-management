import pg from 'pg';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
let dbUrl = '';
for (const line of envContent.split('\n')) {
  const match = line.match(/^\s*DATABASE_URL\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[1] || '';
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    dbUrl = value.trim();
    break;
  }
}

async function main() {
  const pool = new pg.Pool({ connectionString: dbUrl });
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT id, wamid, "recipientPhone", "recipientName", "templateName", "templateParams", status, "errorMessage", "createdAt", "updatedAt"
      FROM whatsapp_message_logs
      WHERE "recipientPhone" = '919305302337'
      ORDER BY "createdAt" DESC;
    `);

    console.log(`Found ${res.rows.length} logs for 919305302337:`);
    for (const row of res.rows) {
      console.log(JSON.stringify(row, null, 2));
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
