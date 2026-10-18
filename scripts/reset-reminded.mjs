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
      UPDATE class_instances
      SET "reminderSentAt" = NULL, "reminderSentBy" = NULL
      WHERE "batchId" IN (
        SELECT id FROM batches WHERE name ILIKE '%Special Batch%'
      );
    `);

    console.log(`✅ Successfully reset ${res.rowCount} class instance(s) to NULL! The button will now show "Notify Students".`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
