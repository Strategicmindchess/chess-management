import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '../src/lib/prisma';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });
const chessFetchQueue = new Queue('chess-fetch', { connection });

async function triggerNamanTest() {
  const studentProfileId = 'cms4qbmk5000004kz988dns18'; // Naman 13614
  const periodType = 'MONTHLY';
  const periodStart = new Date('2026-08-01T00:00:00.000Z');

  console.log(`Clearing wait list...`);
  await chessFetchQueue.drain();
  
  // Read before snapshot
  const beforeSnapshot = await prisma.chessActivitySnapshot.findUnique({
    where: { studentProfileId_periodType_periodStart: { studentProfileId, periodType, periodStart } }
  });

  console.log(`Before Snapshot UpdatedAt: ${beforeSnapshot?.updatedAt.toISOString() || 'NULL'}`);

  console.log(`Enqueuing Naman test job...`);
  await chessFetchQueue.add('chess-fetch-job', {
    studentProfileId,
    periodType,
    periodStart: periodStart.toISOString()
  }, {
    jobId: `naman-test-${Date.now()}`
  });

  console.log('Waiting for completion...');
  let pending = 1;
  while (pending > 0) {
    const counts = await chessFetchQueue.getJobCounts('waiting', 'active', 'delayed', 'completed', 'failed');
    pending = counts.waiting + counts.active + counts.delayed;
    process.stdout.write(`\rProgress: Completed=${counts.completed} Failed=${counts.failed} Pending=${pending}  `);
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log('\n\nChecking Snapshot after job...');
  const afterSnapshot = await prisma.chessActivitySnapshot.findUnique({
    where: { studentProfileId_periodType_periodStart: { studentProfileId, periodType, periodStart } }
  });

  console.log(`After Snapshot UpdatedAt: ${afterSnapshot?.updatedAt.toISOString() || 'NULL'}`);
  
  if (beforeSnapshot?.updatedAt.getTime() === afterSnapshot?.updatedAt.getTime()) {
     console.log('✅ SUCCESS: Snapshot was NOT modified!');
  } else {
     console.log('❌ FAIL: Snapshot was modified!');
  }
  
  process.exit(0);
}

triggerNamanTest().catch(console.error);
