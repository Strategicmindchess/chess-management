import { Queue } from 'bullmq';
import Redis from 'ioredis';
import fs from 'fs';
import path from 'path';

// Read .env
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
let redisUrl = 'redis://localhost:6379';
for (const line of envContent.split('\n')) {
  const match = line.match(/^\s*REDIS_URL\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[1] || '';
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    redisUrl = value.trim();
    break;
  }
}

async function main() {
  console.log(`Connecting to Redis at ${redisUrl}...`);
  const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
  
  // Check both queue names
  for (const qName of ['whatsapp-queue-dev', 'whatsapp-queue']) {
    const q = new Queue(qName, { connection });
    const counts = await q.getJobCounts();
    console.log(`\n=== Queue: "${qName}" ===`);
    console.log(JSON.stringify(counts, null, 2));

    const waitingJobs = await q.getJobs(['waiting', 'active', 'failed', 'completed'], 0, 5);
    console.log(`Recent jobs in ${qName}: ${waitingJobs.length}`);
    for (const j of waitingJobs) {
      console.log(`- Job ID: ${j.id} | State: ${await j.getState()} | Data:`, j.data);
    }
    await q.close();
  }

  await connection.quit();
}

main().catch(console.error);
