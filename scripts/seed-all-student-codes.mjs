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

async function seedAll() {
  const pool = new pg.Pool({ connectionString: dbUrl });
  const client = await pool.connect();

  try {
    const studentsRes = await client.query(`
      SELECT u.id, u.name, u.email, rc.code
      FROM users u
      LEFT JOIN referral_codes rc ON rc."userId" = u.id
      WHERE u.role = 'STUDENT'
      ORDER BY u.id ASC;
    `);

    let idx = 10;
    for (const student of studentsRes.rows) {
      idx++;
      if (student.code) {
        continue;
      }

      // If student 8, give SMC-NAMAN25 for easy testing
      let codeToUse = '';
      if (student.email === 'student8@strategicmindchess.com') {
        codeToUse = 'SMC-NAMAN25';
      } else {
        const parts = student.name.trim().toUpperCase().split(/\s+/);
        const namePart = (parts[0] || 'CHESS').replace(/[^A-Z0-9]/g, '');
        codeToUse = `SMC-${namePart}${idx}${Math.floor(10 + Math.random() * 90)}`;
      }

      const id = 'rc_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
      await client.query(`
        INSERT INTO referral_codes (id, "userId", code, "isActive", "clickCount", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, true, 0, NOW(), NOW())
        ON CONFLICT ("userId") DO NOTHING;
      `, [id, student.id, codeToUse]);

      console.log(`Assigned code to ${student.email}: ${codeToUse}`);
    }

    console.log('Finished seeding all students with active referral codes.');
  } finally {
    client.release();
    await pool.end();
  }
}

seedAll().catch(console.error);
