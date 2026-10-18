import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

async function main() {
  const { Worker } = await import('bullmq');
  const { connection } = await import('../src/workers/queue');
  const { QUEUE_NAMES } = await import('../src/lib/leaderboard-config');
  const { sendClassReminderService } = await import('../src/services/whatsapp/class-reminder.service');
  console.log(`Listening to "${QUEUE_NAMES.WHATSAPP}" to process waiting jobs...`);

  const worker = new Worker(
    QUEUE_NAMES.WHATSAPP,
    async (job) => {
      console.log(`\n========================================`);
      console.log(`[Worker] Picked up Job ID: ${job.id}`);
      console.log(`[Worker] Job Data:`, job.data);
      console.log(`========================================`);

      if (job.data.type === 'CLASS_REMINDER') {
        const result = await sendClassReminderService(
          job.data.refId,
          async (progress) => console.log('Progress:', progress),
          job.data.targetStudentIds
        );
        console.log(`[Worker] Class reminder result:`, result);
        return result;
      }
      return { skipped: true };
    },
    { connection, concurrency: 1 }
  );

  worker.on('completed', (job, result) => {
    console.log(`✅ [Job Completed] ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ [Job Failed] ${job?.id}:`, err.message);
  });

  // Wait 12 seconds to drain jobs
  await new Promise((r) => setTimeout(r, 12000));
  await worker.close();
  console.log('\nDrain test complete.');
}

main().catch(console.error).finally(() => process.exit(0));
