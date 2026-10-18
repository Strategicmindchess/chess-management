import { Worker } from 'bullmq';
import Redis from 'ioredis';
import fs from 'fs';
import path from 'path';

// Load .env
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value.trim();
  }
}

async function main() {
  console.log('Connecting to Redis and processing waiting jobs in whatsapp-queue-dev...');
  const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });

  const { sendClassReminderService } = await import('../src/services/whatsapp/class-reminder.service.js');

  const worker = new Worker(
    'whatsapp-queue-dev',
    async (job) => {
      console.log(`\n[Worker] Processing Job ID: ${job.id} | Type: ${job.data.type}`);
      if (job.data.type === 'CLASS_REMINDER') {
        const result = await sendClassReminderService(
          job.data.refId,
          async (progress) => console.log('  Progress:', progress),
          job.data.targetStudentIds
        );
        console.log('[Worker] Result:', JSON.stringify(result, null, 2));
        return result;
      }
      console.log('[Worker] Skipped non-reminder job:', job.data.type);
      return { skipped: true };
    },
    { connection, concurrency: 1 }
  );

  worker.on('completed', (job) => console.log(`✅ Job ${job.id} completed!`));
  worker.on('failed', (job, err) => console.error(`❌ Job ${job?.id} failed:`, err));

  // Let it run for 10 seconds to pick up waiting jobs
  await new Promise((r) => setTimeout(r, 10000));
  await worker.close();
  await connection.quit();
  console.log('\nWorker finished processing.');
}

main().catch(console.error);
