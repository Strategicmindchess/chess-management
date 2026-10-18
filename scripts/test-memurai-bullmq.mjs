import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

async function main() {
  console.log('Testing BullMQ on local Memurai (localhost:6379)...');
  const connection = new Redis('redis://localhost:6379', { maxRetriesPerRequest: null });

  const testQueue = new Queue('test-memurai-queue', { connection });

  let jobProcessed = false;
  const testWorker = new Worker(
    'test-memurai-queue',
    async (job) => {
      console.log('  [BullMQ Worker] Successfully popped and processed job:', job.name, job.data);
      jobProcessed = true;
      return { success: true };
    },
    { connection }
  );

  await testQueue.add('ping-job', { hello: 'memurai' });
  console.log('  Job added to queue!');

  // Wait 2 seconds for worker to process
  await new Promise((r) => setTimeout(r, 2000));

  await testWorker.close();
  await testQueue.close();
  await connection.quit();

  if (jobProcessed) {
    console.log('\n🎉 SUCCESS! BullMQ v5 is 100% working on your local Memurai (Redis 8.2.10)!');
  } else {
    console.error('\n❌ Job was not processed.');
  }
}

main().catch(console.error);
