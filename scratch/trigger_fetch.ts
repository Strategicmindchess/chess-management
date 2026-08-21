import { processChessFetchJob } from '../src/workers/chess-fetch.worker';
import { prisma } from '../src/lib/prisma';

async function main() {
  const profile = await prisma.studentProfile.findFirst({
    where: { lichessId: 'Itz_Flora' }
  });

  if (!profile) return;

  const job: any = {
    data: {
      studentProfileId: profile.id,
      chessComUsername: profile.chessComId,
      lichessUsername: profile.lichessId,
      periodType: 'MONTHLY',
      periodStart: '2026-08-01T00:00:00.000Z',
      periodEnd: '2026-08-31T23:59:59.999Z'
    },
    log: async (msg: string) => console.log(`[JOB LOG] ${msg}`),
    updateProgress: async (p: number) => console.log(`[PROGRESS] ${p}%`)
  };

  console.log("Triggering chess-fetch worker manually for Flora...");
  const result = await processChessFetchJob(job);
  console.log("Result:", result);

  const snapshot = await prisma.chessActivitySnapshot.findFirst({
    where: {
      studentProfileId: profile.id,
      periodType: 'MONTHLY',
      periodStart: new Date('2026-08-01T00:00:00.000Z')
    }
  });

  console.log("New Snapshot in DB:", snapshot);
}

main().catch(console.error).finally(() => prisma.$disconnect());
