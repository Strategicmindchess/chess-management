import { Queue } from 'bullmq';
import { prisma } from '../src/lib/prisma';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });
const chessFetchQueue = new Queue('chess-fetch', { connection });

async function runProductionSync() {
  console.log('--- Triggering Full Production Sync ---');
  
  const activeStudents = await prisma.studentProfile.findMany({
    where: {
      user: { role: 'STUDENT' },
      OR: [
        { chessAccount: { chessComUsername: { not: null } } },
        { chessAccount: { lichessUsername: { not: null } } },
        { chessComId: { not: null } },
        { lichessId: { not: null } }
      ]
    },
    select: { id: true, user: { select: { name: true } } }
  });

  console.log(`Found ${activeStudents.length} students with linked accounts.`);

  // Period setup (August 2026)
  const periodType = 'MONTHLY';
  const periodStart = new Date('2026-08-01T00:00:00.000Z');

  // Snapshot timestamps before run
  const beforeSnapshots = await prisma.chessActivitySnapshot.findMany({
    where: { periodType, periodStart }
  });
  const beforeMap = new Map(beforeSnapshots.map(s => [s.studentProfileId, s.updatedAt.getTime()]));

  console.log(`Enqueuing ${activeStudents.length} jobs...`);
  await chessFetchQueue.drain(); // Clear old jobs just in case

  for (const student of activeStudents) {
    await chessFetchQueue.add('chess-fetch-job', {
      studentProfileId: student.id,
      periodType,
      periodStart: periodStart.toISOString()
    }, {
      jobId: `${student.id}-${periodType}-${periodStart.getTime()}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 }
    });
  }
  
  console.log('Jobs enqueued! Waiting for them to complete (this will take a minute)...');
  
  let pending = activeStudents.length;
  while (pending > 0) {
    const counts = await chessFetchQueue.getJobCounts('waiting', 'active', 'delayed', 'completed', 'failed');
    pending = counts.waiting + counts.active + counts.delayed;
    
    process.stdout.write(`\rProgress: Completed=${counts.completed} Failed=${counts.failed} Pending=${pending}  `);
    await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log('\n\n--- Sync Finished! Running Verification ---');
  
  // Verification 1: Check BullMQ failed state and FetchLogs
  const failedJobs = await chessFetchQueue.getFailed();
  console.log(`\n1. Failed Jobs Count: ${failedJobs.length}`);
  for (const job of failedJobs) {
    console.log(`   - Job ${job.id} failed with error: ${job.failedReason}`);
  }

  // Verification 2 & 3: Snapshot changes
  const afterSnapshots = await prisma.chessActivitySnapshot.findMany({
    where: { periodType, periodStart }
  });
  const afterMap = new Map(afterSnapshots.map(s => [s.studentProfileId, s.updatedAt.getTime()]));
  
  let unchangedFailed = 0;
  let updatedSuccess = 0;

  console.log('\n2 & 3. Snapshot verification:');
  for (const student of activeStudents) {
    const failedJob = failedJobs.find(j => j.data.studentProfileId === student.id);
    const beforeTime = beforeMap.get(student.id);
    const afterTime = afterMap.get(student.id);

    if (failedJob) {
      if (beforeTime === afterTime) {
        unchangedFailed++;
        // console.log(`   [PASS] ${student.user.name}: Failed fetch, snapshot UNCHANGED.`);
      } else {
        console.log(`   [FAIL] ${student.user.name}: Failed fetch, but snapshot WAS MODIFIED!`);
      }
    } else {
      if (beforeTime !== afterTime) {
        updatedSuccess++;
        // console.log(`   [PASS] ${student.user.name}: Successful fetch, snapshot UPDATED.`);
      } else {
        // It might be unchanged if they had genuinely 0 games or exact same data, but usually updatedAt changes on upsert.
        // Prisma upsert updating identical data usually changes updatedAt anyway.
        console.log(`   [WARN] ${student.user.name}: Successful fetch, but snapshot was NOT modified (might just be identical data).`);
      }
    }
  }
  
  console.log(`\nFinal Report:`);
  console.log(`- Students verified with unchanged snapshots after failure: ${unchangedFailed} / ${failedJobs.length}`);
  console.log(`- Students verified with updated snapshots after success: ${updatedSuccess} / ${activeStudents.length - failedJobs.length}`);
  
  process.exit(0);
}

runProductionSync().catch(console.error);
