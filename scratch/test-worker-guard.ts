import workerFn from '../src/workers/chess-fetch.worker';
import { prisma } from '../src/lib/prisma';

// Create a mock Job object for BullMQ
const mockJob: any = {
  data: {
    studentProfileId: 'cms4qbmk5000004kz988dns18', // Naman 13614 (Chess.com 410)
    periodType: 'MONTHLY',
    periodStart: new Date('2026-08-01T00:00:00.000Z')
  },
  log: async (msg: string) => {
    console.log(`[Job Log] ${msg}`);
  },
  updateProgress: async (progress: number) => {
    console.log(`[Job Progress] ${progress}%`);
  }
};

async function testWorkerGuard() {
  console.log('--- Starting Worker Guard Test ---');
  try {
    await workerFn(mockJob);
    console.error('❌ ERROR: Worker completed successfully! The Snapshot Guard DID NOT trigger!');
    process.exit(1);
  } catch (error: any) {
    console.log(`\n✅ Worker threw an error as expected:`);
    console.log(error.message);
    
    if (error.message.includes('Data Fetch Failed')) {
      console.log('✅ Snapshot Guard successfully aborted the DB write.');
    } else {
      console.log('⚠️ Worker threw an error, but it was not the Snapshot Guard error.');
    }
  }

  // Verify that the snapshot for August 2026 was not created/updated today
  const snapshot = await prisma.chessActivitySnapshot.findUnique({
    where: {
      studentProfileId_periodType_periodStart: {
        studentProfileId: 'cms4qbmk5000004kz988dns18',
        periodType: 'MONTHLY',
        periodStart: new Date('2026-08-01T00:00:00.000Z')
      }
    }
  });

  if (!snapshot) {
    console.log('✅ Verified: No snapshot exists in the DB for this period (Zero write aborted).');
  } else {
    console.log('⚠️ Snapshot exists in DB. Need to check if it was overwritten.');
    console.log('UpdatedAt:', snapshot.updatedAt);
  }
}

testWorkerGuard()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
