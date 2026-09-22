const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:jdFvRoqjIsfVztqlnBGwgSHbLyFYsXKp@tokaido.proxy.rlwy.net:52327/railway'
});

async function run() {
  await client.connect();
  
  const res = await client.query(`
    UPDATE class_logs
    SET "penaltyAmount" = 0,
        "penaltyWaived" = true,
        "adminPenaltyOverride" = true,
        "penaltyNote" = 'Manually cleared testing penalty'
    WHERE "penaltyAmount" > 0 OR "penaltyWaived" = false
    RETURNING id, "penaltyAmount"
  `);
  
  console.log(`✅ Cleared penalties for ${res.rows.length} records.`);
  
  await client.end();
}

run().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
