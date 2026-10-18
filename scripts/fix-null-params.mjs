import pg from 'pg';
import fs from 'fs';
import path from 'path';

// Read .env
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
      UPDATE whatsapp_message_logs
      SET "templateParams" = jsonb_build_object(
        'student_name', COALESCE("recipientName", 'Student'),
        'batch_name', 'Special Batch (42XK)',
        'class_date', '18 Oct',
        'class_time', '01:00 PM',
        'class_link', 'https://meet.google.com/smc-chess-class'
      )
      WHERE "templateParams" IS NULL OR "templateParams"::text = '{}' OR "templateParams"::text = 'null';
    `);

    console.log(`✅ Updated ${res.rowCount} rows with valid templateParams in whatsapp_message_logs!`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
