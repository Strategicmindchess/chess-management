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
    // 1. Reset ALL reminderSentAt across all class_instances
    const updateRes = await client.query(`
      UPDATE class_instances
      SET "reminderSentAt" = NULL, "reminderSentBy" = NULL
      WHERE "reminderSentAt" IS NOT NULL;
    `);
    console.log(`Cleared reminderSentAt on ${updateRes.rowCount} class instances.`);

    // 2. Query today's class instances to verify
    const res = await client.query(`
      SELECT ci.id, b.name as batch_name, ci.date, ci."startTime", ci."endTime", ci."reminderSentAt"
      FROM class_instances ci
      JOIN batches b ON ci."batchId" = b.id
      ORDER BY ci.date DESC, ci."startTime" DESC
      LIMIT 5;
    `);
    console.log('Current recent class instances:');
    console.table(res.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
