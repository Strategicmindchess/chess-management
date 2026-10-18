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
      SELECT sp.id as student_id, u.name, u.phone as user_phone, sp."parentPhone"
      FROM student_profiles sp
      JOIN users u ON sp."userId" = u.id
      WHERE sp.id IN ('cmrm81zcv000m5ciawp9p0b9w', 'cmrm81zgz000o5ciacgwbj1tu', 'cmtvv2jba0002dwiaaawd5cui');
    `);

    console.log('--- ENROLLED STUDENTS IN SPECIAL BATCH ---');
    console.table(res.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
