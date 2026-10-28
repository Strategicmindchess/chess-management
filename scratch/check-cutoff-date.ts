import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { getISTDayBounds } from '../src/lib/timezone';
import { fromZonedTime } from 'date-fns-tz';

async function main() {
  const cutoffIST = fromZonedTime('2026-10-28 00:00:00', 'Asia/Kolkata');
  console.log('Cutoff IST date object:', cutoffIST.toISOString());

  const pastCount = await prisma.classInstance.count({
    where: { date: { lt: cutoffIST } }
  });

  const futureCount = await prisma.classInstance.count({
    where: { date: { gte: cutoffIST } }
  });

  const total = await prisma.classInstance.count();

  console.log(`Class Instances Breakdown around 28 Oct 2026:`);
  console.log(`- Before 28 Oct 2026 (Past / Protected): ${pastCount} instances (will remain NULL)`);
  console.log(`- From 28 Oct 2026 onwards (Future): ${futureCount} instances (will be backfilled with batch coach)`);
  console.log(`- Total: ${total}`);

  const sampleFuture = await prisma.classInstance.findMany({
    where: { date: { gte: cutoffIST } },
    take: 5,
    include: { batch: { select: { code: true, coachProfileId: true } } },
    orderBy: { date: 'asc' }
  });

  console.log('\nSample future instances from 28 Oct 2026:');
  for (const s of sampleFuture) {
    console.log(`- ID: ${s.id}, Batch: ${s.batch.code}, Date: ${s.date.toISOString()}, Time: ${s.startTime}-${s.endTime}, BatchCoach: ${s.batch.coachProfileId}`);
  }
}

main().finally(() => prisma.$disconnect());
