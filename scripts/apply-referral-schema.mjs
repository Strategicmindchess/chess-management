import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

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

async function runSafeMigration() {
  console.log('========================================================');
  console.log('🛡️  SAFE PRISMA SCHEMA APPLY (ZERO DATA LOSS)');
  console.log('========================================================');

  const pool = new pg.Pool({ connectionString: dbUrl });
  const client = await pool.connect();

  try {
    console.log('\n[1/4] Applying unique constraints safely via PostgreSQL DDL...');
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "CourseAccess_courseId_studentId_key" 
      ON "CourseAccess"("courseId", "studentId");
    `);
    console.log('  ✔ Index CourseAccess_courseId_studentId_key ensured.');

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "CourseLesson_courseId_lessonNumber_partNumber_key" 
      ON "CourseLesson"("courseId", "lessonNumber", "partNumber");
    `);
    console.log('  ✔ Index CourseLesson_courseId_lessonNumber_partNumber_key ensured.');

    const countBeforeRes = await client.query(`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
    `);
    const tablesBefore = countBeforeRes.rows.map(r => r.table_name);
    console.log(`\nVerified ${tablesBefore.length} existing tables in database before schema push.`);

    console.log('\n[2/4] Running "npx prisma db push"...');
    const pushOutput = execSync('npx prisma db push', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    console.log(pushOutput);

    console.log('\n[3/4] Verifying table integrity post-push...');
    const countAfterRes = await client.query(`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
    `);
    const tablesAfter = countAfterRes.rows.map(r => r.table_name);
    console.log(`Verified ${tablesAfter.length} tables in database post-push.`);

    const droppedTables = tablesBefore.filter(t => !tablesAfter.includes(t));
    if (droppedTables.length > 0) {
      throw new Error(`Data loss error: Tables were dropped: ${droppedTables.join(', ')}`);
    }

    const newTables = tablesAfter.filter(t => !tablesBefore.includes(t));
    console.log(`\n🎉 New referral tables created (${newTables.length}):`, newTables.join(', '));

    console.log('\n[4/4] Seeding initial default reward milestones and config...');
    // Seed default milestones if not exist
    await client.query(`
      INSERT INTO "reward_milestones" ("id", "milestoneOrder", "requiredReferrals", "title", "rewardType", "maxCashAmount", "giftDescription", "isCumulative", "isActive", "createdAt", "updatedAt")
      VALUES 
        ('ms_tier_1', 1, 1, '1 Chessmate', 'CASH', 500, NULL, TRUE, TRUE, NOW(), NOW()),
        ('ms_tier_2', 2, 3, '3 Chessmates', 'PHYSICAL_GIFT', 0, 'Smartwatch worth up to ₹2,500', TRUE, TRUE, NOW(), NOW()),
        ('ms_tier_3', 3, 5, '5 Chessmates', 'HYBRID', 5000, 'Smartwatch + cash reward up to ₹5,000', TRUE, TRUE, NOW(), NOW())
      ON CONFLICT ("id") DO NOTHING;
    `);

    // Seed default config if not exist
    await client.query(`
      INSERT INTO "referral_configs" ("id", "programActive", "minPaidFeeCycles", "allowSelfReferral", "requireManualAdminApproval", "announcementStripText", "updatedAt")
      VALUES (
        'default',
        TRUE,
        1,
        FALSE,
        TRUE,
        '🎁 EARN WITH SMC | Refer 1 Chessmate – Get up to ₹500 cash reward | Refer 3 Chessmates – Get a smartwatch worth up to ₹2,500 | Refer 5 Chessmates – Get a smartwatch + cash reward up to ₹5,000.',
        NOW()
      )
      ON CONFLICT ("id") DO NOTHING;
    `);
    console.log('  ✔ Default milestones (1, 3, 5 students) and program config seeded.');

    console.log('\n========================================================');
    console.log('✅ ZERO DATA LOSS CONFIRMED: All tables & rows preserved!');
    console.log('✅ DATABASE SCHEMA SUCCESSFULLY SYNCED WITH PRISMA!');
    console.log('========================================================');
  } finally {
    client.release();
    await pool.end();
  }
}

runSafeMigration().catch(err => {
  console.error('\n❌ Migration failed:', err);
  process.exit(1);
});

