import { prisma } from '../lib/prisma';

async function fixPastPenalties() {
  console.log("Applying fix to past class logs...");

  const cutoff = new Date('2026-08-30T00:00:00.000Z');

  // 1. Wipe incorrect penalties for historical classes ONLY
  const updatedPenalties = await prisma.classLog.updateMany({
    where: {
      date: { lt: cutoff },
      penaltyNote: { contains: 'Attendance never marked' },
    },
    data: {
      penaltyAmount: 0,
      penaltyNote: null,
      hasPhonePenalty: false,
      penaltyCalculatedAt: new Date()
    }
  });
  console.log(`Successfully cleared incorrect penalties on ${updatedPenalties.count} historical classes.`);

  // 2. Protect any remaining historical uncalculated classes from being hit by the worker
  const updatedPending = await prisma.classLog.updateMany({
    where: {
      date: { lt: cutoff },
      penaltyCalculatedAt: null
    },
    data: {
      penaltyCalculatedAt: new Date()
    }
  });
  console.log(`Safely protected ${updatedPending.count} remaining uncalculated historical classes.`);
}

fixPastPenalties().then(() => {
  console.log("Done.");
  process.exit(0);
}).catch((e) => {
  console.error(e);
  process.exit(1);
});

