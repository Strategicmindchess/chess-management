const { Client } = require('pg');
async function clear() {
  const client = new Client({ connectionString: 'postgresql://postgres:69shivam69@localhost:5432/smc_crm?schema=public' });
  await client.connect();
  await client.query('DELETE FROM coach_availability');
  await client.end();
  console.log('Cleared coach_availability');
}
clear().catch(console.error);
