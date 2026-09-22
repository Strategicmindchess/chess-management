/**
 * Production-safe migration script for chocolate_question_records.
 *
 * What changed in schema:
 *   1. Added `classDate` column (DateTime @db.Date)
 *   2. Removed `questionNumber` column
 *   3. Added `marksAwarded` column (Int)
 *   4. Added unique constraint on [studentProfileId, classDate]
 *
 * This script:
 *   - Adds new columns safely (IF NOT EXISTS / with checks)
 *   - Backfills classDate from createdAt for existing rows
 *   - Drops old columns if they exist
 *   - Adds the unique constraint only after verifying no duplicates
 *   - All in a transaction for safety
 */
import 'dotenv/config';
import pg from 'pg';

async function main() {
  const client = new pg.Client(process.env.DATABASE_URL);
  await client.connect();

  console.log('🔗 Connected to database\n');

  // 1. Check current state
  const cols = await client.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'chocolate_question_records' ORDER BY ordinal_position"
  );
  const existingCols = cols.rows.map((r: any) => r.column_name as string);
  console.log('📋 Current columns:', existingCols);

  const countRes = await client.query('SELECT count(*)::int as cnt FROM chocolate_question_records');
  const rowCount = countRes.rows[0].cnt;
  console.log(`📊 Current row count: ${rowCount}\n`);

  // Start transaction
  await client.query('BEGIN');

  try {
    // 2. Add classDate column if missing
    if (!existingCols.includes('classDate')) {
      console.log('➕ Adding classDate column...');
      await client.query(`
        ALTER TABLE chocolate_question_records
        ADD COLUMN "classDate" DATE
      `);

      // Backfill from createdAt if there are rows
      if (rowCount > 0) {
        console.log('🔄 Backfilling classDate from createdAt...');
        await client.query(`
          UPDATE chocolate_question_records
          SET "classDate" = "createdAt"::date
          WHERE "classDate" IS NULL
        `);
      }

      // Now make it NOT NULL
      await client.query(`
        ALTER TABLE chocolate_question_records
        ALTER COLUMN "classDate" SET NOT NULL
      `);
      console.log('✅ classDate column added and backfilled\n');
    } else {
      console.log('✅ classDate column already exists\n');
    }

    // 3. Add marksAwarded column if missing
    if (!existingCols.includes('marksAwarded')) {
      console.log('➕ Adding marksAwarded column...');
      await client.query(`
        ALTER TABLE chocolate_question_records
        ADD COLUMN "marksAwarded" INTEGER
      `);

      // Backfill from points column
      if (rowCount > 0 && existingCols.includes('points')) {
        console.log('🔄 Backfilling marksAwarded from points...');
        await client.query(`
          UPDATE chocolate_question_records
          SET "marksAwarded" = "points"
          WHERE "marksAwarded" IS NULL
        `);
      }

      // Set NOT NULL with default
      await client.query(`
        ALTER TABLE chocolate_question_records
        ALTER COLUMN "marksAwarded" SET DEFAULT 0
      `);
      // Fill remaining NULLs
      await client.query(`
        UPDATE chocolate_question_records SET "marksAwarded" = 0 WHERE "marksAwarded" IS NULL
      `);
      await client.query(`
        ALTER TABLE chocolate_question_records
        ALTER COLUMN "marksAwarded" SET NOT NULL
      `);
      console.log('✅ marksAwarded column added\n');
    } else {
      console.log('✅ marksAwarded column already exists\n');
    }

    // 4. Drop questionNumber column if it still exists
    if (existingCols.includes('questionNumber')) {
      console.log('🗑️  Dropping questionNumber column...');
      await client.query(`
        ALTER TABLE chocolate_question_records
        DROP COLUMN "questionNumber"
      `);
      console.log('✅ questionNumber column dropped\n');
    }

    // 5. Check for duplicates before adding unique constraint
    if (rowCount > 0) {
      const dupes = await client.query(`
        SELECT "studentProfileId", "classDate", count(*) as cnt
        FROM chocolate_question_records
        GROUP BY "studentProfileId", "classDate"
        HAVING count(*) > 1
      `);

      if (dupes.rows.length > 0) {
        console.log(`⚠️  Found ${dupes.rows.length} duplicate group(s). Deduplicating (keeping latest)...`);

        // Keep only the row with the latest createdAt per group
        await client.query(`
          DELETE FROM chocolate_question_records a
          USING chocolate_question_records b
          WHERE a."studentProfileId" = b."studentProfileId"
            AND a."classDate" = b."classDate"
            AND a."createdAt" < b."createdAt"
        `);
        console.log('✅ Duplicates removed\n');
      } else {
        console.log('✅ No duplicates found\n');
      }
    }

    // 6. Add unique constraint if not exists
    const constraintCheck = await client.query(`
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE table_name = 'chocolate_question_records'
        AND constraint_type = 'UNIQUE'
        AND constraint_name LIKE '%studentProfileId_classDate%'
    `);

    if (constraintCheck.rows.length === 0) {
      console.log('🔒 Adding unique constraint [studentProfileId, classDate]...');
      await client.query(`
        ALTER TABLE chocolate_question_records
        ADD CONSTRAINT "chocolate_question_records_studentProfileId_classDate_key"
        UNIQUE ("studentProfileId", "classDate")
      `);
      console.log('✅ Unique constraint added\n');
    } else {
      console.log('✅ Unique constraint already exists\n');
    }

    // 7. Add indexes if missing
    console.log('📇 Ensuring indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS "chocolate_question_records_studentProfileId_month_idx"
      ON chocolate_question_records ("studentProfileId", "month")
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS "chocolate_question_records_coachId_month_idx"
      ON chocolate_question_records ("coachId", "month")
    `);
    console.log('✅ Indexes ensured\n');

    // Commit
    await client.query('COMMIT');
    console.log('🎉 Migration complete! Database is now in sync with schema.');
    console.log('   You can now run: npx prisma db push (it should show "already in sync")');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed, rolled back:', err);
    throw err;
  }

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
