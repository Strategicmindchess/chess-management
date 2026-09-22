import 'dotenv/config';
import pg from 'pg';

async function main() {
  const client = new pg.Client(process.env.DATABASE_URL);
  await client.connect();

  // Check existing columns
  const cols = await client.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'chocolate_question_records' ORDER BY ordinal_position"
  );
  console.log('Current columns:', cols.rows.map((r: any) => r.column_name));

  // Check row count
  const count = await client.query('SELECT count(*) FROM chocolate_question_records');
  console.log('Row count:', count.rows[0].count);

  // If classDate column exists, check for duplicates
  const hasClassDate = cols.rows.some((r: any) => r.column_name === 'classDate');
  if (hasClassDate) {
    const dupes = await client.query(`
      SELECT "studentProfileId", "classDate", count(*) as cnt
      FROM chocolate_question_records
      GROUP BY "studentProfileId", "classDate"
      HAVING count(*) > 1
    `);
    console.log('Duplicate groups:', dupes.rows.length);
    if (dupes.rows.length > 0) {
      console.log('Duplicates:', dupes.rows);
    }
  } else {
    console.log('classDate column does NOT exist yet - safe to push!');
  }

  await client.end();
}

main().catch(console.error);
