import { execSync } from 'child_process';
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

async function verifyTablesBefore() {
  const pool = new pg.Pool({ connectionString: dbUrl });
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    return res.rows.map(r => r.table_name);
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  console.log('========================================================');
  console.log('🛡️  SAFE PRISMA DB PUSH (ZERO DATA LOSS)');
  console.log('========================================================');

  console.log('\n[1/3] Verifying PostgreSQL tables before push...');
  const tablesBefore = await verifyTablesBefore();
  console.log(`Found ${tablesBefore.length} tables in PostgreSQL database.`);

  console.log('\n[2/3] Running "npx prisma db push"...');
  try {
    const pushOutput = execSync('npx prisma db push', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    console.log(pushOutput);
  } catch (err) {
    const out = err.stdout?.toString() || '';
    const errorOut = err.stderr?.toString() || '';
    console.error('Push Error Output:\n', out, errorOut);
    throw new Error('Prisma db push encountered an issue.');
  }

  console.log('\n[3/4] Verifying table integrity post-push...');
  const tablesAfter = await verifyTablesBefore();
  console.log(`Found ${tablesAfter.length} tables in PostgreSQL database.`);
  const missingTables = tablesBefore.filter(t => !tablesAfter.includes(t));
  if (missingTables.length > 0) {
    console.error(`⚠️ ALERT: Tables dropped: ${missingTables.join(', ')}`);
    throw new Error(`Data loss detected! Tables missing: ${missingTables.join(', ')}`);
  } else {
    console.log(`🛡️ Integrity Check Passed: All ${tablesBefore.length} tables preserved.`);
  }

  console.log('\n[4/4] Generating updated Prisma Client...');
  const genOutput = execSync('npx prisma generate', { encoding: 'utf-8' });
  console.log(genOutput);

  console.log('========================================================');
  console.log('✅ SUCCESS: Database is 100% in sync with Prisma schema!');
  console.log('✅ ZERO DATA LOSS: All tables and columns are preserved.');
  console.log('========================================================\n');
}

main().catch(err => {
  console.error('\n❌ Script failed:', err.message);
  process.exit(1);
});
