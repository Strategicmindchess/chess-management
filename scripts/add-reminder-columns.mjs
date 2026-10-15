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
  console.log('Connecting to PostgreSQL database...');
  const pool = new pg.Pool({ connectionString: dbUrl });
  const client = await pool.connect();
  try {
    console.log('Running non-destructive migration...');
    await client.query(`ALTER TABLE "class_instances" ADD COLUMN IF NOT EXISTS "reminderSentAt" TIMESTAMP(3);`);
    await client.query(`ALTER TABLE "class_instances" ADD COLUMN IF NOT EXISTS "reminderSentBy" TEXT;`);
    console.log('✅ Columns "reminderSentAt" and "reminderSentBy" successfully added to "class_instances"!');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
