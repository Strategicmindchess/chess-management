const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:jdFvRoqjIsfVztqlnBGwgSHbLyFYsXKp@tokaido.proxy.rlwy.net:52327/railway'
});

async function run() {
  await client.connect();
  
  // Get count of logs created today
  const res = await client.query('SELECT count(*) FROM class_logs WHERE "createdAt" >= \'2026-09-17 00:00:00\'');
  
  console.log('Class logs created today:', res.rows[0].count);
  await client.end();
}

run().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
