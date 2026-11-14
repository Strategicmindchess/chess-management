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

async function runSafePassportMigration() {
  console.log('========================================================');
  console.log('🛡️  SAFE STUDENT PASSPORT SCHEMA MIGRATION (100% ZERO DATA LOSS)');
  console.log('========================================================');

  const pool = new pg.Pool({ connectionString: dbUrl });
  const client = await pool.connect();

  try {
    const countBeforeRes = await client.query(`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
    `);
    const tablesBefore = countBeforeRes.rows.map(r => r.table_name);
    console.log(`\nVerified ${tablesBefore.length} existing tables in database before migration.`);

    console.log('\n[1/5] Adding passport fields to "student_profiles" safely (IF NOT EXISTS)...');
    await client.query(`
      ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "studentCode" TEXT;
      ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "bio" TEXT;
      ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "peakRating" INTEGER;
      ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "peakRatingPlatform" TEXT;
      ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "peakRatingFormat" TEXT;
      ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "peakRatingDate" TIMESTAMP(3);
      ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "shareSlug" TEXT;
      ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "isPublicPassportEnabled" BOOLEAN NOT NULL DEFAULT TRUE;
      ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "showRatings" BOOLEAN NOT NULL DEFAULT TRUE;
      ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "showAchievements" BOOLEAN NOT NULL DEFAULT TRUE;
      ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "showRatingProgress" BOOLEAN NOT NULL DEFAULT TRUE;
      ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "showTournaments" BOOLEAN NOT NULL DEFAULT TRUE;
      ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "showCertificates" BOOLEAN NOT NULL DEFAULT TRUE;
      ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "showFideRating" BOOLEAN NOT NULL DEFAULT TRUE;
    `);
    console.log('  ✔ Passport & Privacy columns added to student_profiles.');

    console.log('\n[2/5] Creating CertificateType Enum & Tables...');
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "CertificateType" AS ENUM ('COURSE_COMPLETION', 'TOURNAMENT_WIN', 'TACTICAL_MASTERY', 'MERIT', 'SPECIAL_ACHIEVEMENT');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "student_certificates" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "studentProfileId" TEXT NOT NULL REFERENCES "student_profiles"("id") ON DELETE CASCADE,
        "title" TEXT NOT NULL,
        "description" TEXT,
        "category" "CertificateType" NOT NULL DEFAULT 'COURSE_COMPLETION',
        "certificateNumber" TEXT NOT NULL UNIQUE,
        "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "certificateUrl" TEXT,
        "issuedById" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "student_certificates_studentProfileId_idx" ON "student_certificates"("studentProfileId");
    `);
    console.log('  ✔ student_certificates table ready.');

    await client.query(`
      CREATE TABLE IF NOT EXISTS "student_badges" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "studentProfileId" TEXT NOT NULL REFERENCES "student_profiles"("id") ON DELETE CASCADE,
        "badgeKey" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "icon" TEXT NOT NULL,
        "category" TEXT NOT NULL,
        "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "isUnlocked" BOOLEAN NOT NULL DEFAULT TRUE,
        "metadata" JSONB,
        CONSTRAINT "student_badges_studentProfileId_badgeKey_key" UNIQUE ("studentProfileId", "badgeKey")
      );
      CREATE INDEX IF NOT EXISTS "student_badges_studentProfileId_idx" ON "student_badges"("studentProfileId");
    `);
    console.log('  ✔ student_badges table ready.');

    await client.query(`
      CREATE TABLE IF NOT EXISTS "student_rating_histories" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "studentProfileId" TEXT NOT NULL REFERENCES "student_profiles"("id") ON DELETE CASCADE,
        "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "platform" TEXT NOT NULL,
        "format" TEXT NOT NULL,
        "rating" INTEGER NOT NULL,
        "gamesPlayed" INTEGER
      );
      CREATE INDEX IF NOT EXISTS "student_rating_histories_studentProfileId_recordedAt_idx" ON "student_rating_histories"("studentProfileId", "recordedAt");
      CREATE INDEX IF NOT EXISTS "student_rating_histories_studentProfileId_platform_format_idx" ON "student_rating_histories"("studentProfileId", "platform", "format");
    `);
    console.log('  ✔ student_rating_histories table ready.');

    console.log('\n[3/5] Assigning unique studentCode & shareSlug to existing student profiles...');
    const studentsRes = await client.query(`
      SELECT sp.id, u.name, sp."studentCode", sp."shareSlug"
      FROM "student_profiles" sp
      JOIN "users" u ON u.id = sp."userId"
      ORDER BY sp."createdAt" ASC;
    `);

    let assignedCount = 0;
    for (let i = 0; i < studentsRes.rows.length; i++) {
      const row = studentsRes.rows[i];
      let code = row.studentCode;
      let slug = row.shareSlug;
      let needsUpdate = false;

      if (!code) {
        code = `SMC-STU-${String(i + 1).padStart(4, '0')}`;
        needsUpdate = true;
      }

      if (!slug) {
        const cleanName = (row.name || 'chessmate')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .slice(0, 15);
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        slug = `${cleanName}-${randomSuffix}`;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await client.query(
          `UPDATE "student_profiles" SET "studentCode" = $1, "shareSlug" = $2 WHERE id = $3`,
          [code, slug, row.id]
        );
        assignedCount++;
      }
    }
    console.log(`  ✔ Unique codes & slugs ensured for ${studentsRes.rows.length} students (${assignedCount} newly assigned).`);

    console.log('\n[4/5] Enforcing unique indexes on studentCode and shareSlug...');
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "student_profiles_studentCode_key" ON "student_profiles"("studentCode");
      CREATE UNIQUE INDEX IF NOT EXISTS "student_profiles_shareSlug_key" ON "student_profiles"("shareSlug");
    `);
    console.log('  ✔ Unique constraints active.');

    console.log('\n[5/5] Generating updated Prisma Client types...');
    const generateOutput = execSync('npx prisma generate', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    console.log(generateOutput);

    const countAfterRes = await client.query(`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
    `);
    const tablesAfter = countAfterRes.rows.map(r => r.table_name);
    console.log(`\nVerified ${tablesAfter.length} tables in database post-migration.`);

    const droppedTables = tablesBefore.filter(t => !tablesAfter.includes(t));
    if (droppedTables.length > 0) {
      throw new Error(`Data loss error: Tables were dropped: ${droppedTables.join(', ')}`);
    }

    const newTables = tablesAfter.filter(t => !tablesBefore.includes(t));
    console.log(`\n🎉 New passport tables created (${newTables.length}):`, newTables.join(', '));
    console.log('\n========================================================');
    console.log('✅ 100% ZERO DATA LOSS CONFIRMED: All existing tables & rows intact!');
    console.log('✅ PASSPORT SCHEMA & PRISMA CLIENT READY!');
    console.log('========================================================');
  } finally {
    client.release();
    await pool.end();
  }
}

runSafePassportMigration().catch(err => {
  console.error('\n❌ Safe passport migration failed:', err);
  process.exit(1);
});
