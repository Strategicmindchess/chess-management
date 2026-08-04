import { Worker } from 'bullmq';
import { connection } from './queue';
import { processBatchSync } from './batch.processor';

export const batchWorker = new Worker(
  'batch-queue',
  async (job) => {
    if (job.name === 'sync-future-instances') {
      await processBatchSync(job);
    }
  },
  { connection }
);

batchWorker.on('completed', (job) => {
  console.log(`[BatchWorker] Job ${job.id} completed successfully.`);
});

batchWorker.on('failed', (job, err) => {
  console.log(`[BatchWorker] Job ${job?.id} failed with error: ${err.message}`);
});
