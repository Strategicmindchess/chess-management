import { prisma } from "../src/lib/prisma";

async function clearAllBuggyPenalties() {
  console.log("Searching for incorrect 'Attendance never marked' penalties...");

  const buggedLogs = await prisma.classLog.findMany({
    where: {
      penaltyNote: { contains: "Attendance never marked" },
      penaltyAmount: { gt: 0 }
    }
  });

  if (buggedLogs.length === 0) {
    console.log("No buggy penalties found! The database is clean.");
    return;
  }

  console.log(`Found ${buggedLogs.length} buggy penalties. Clearing them now...`);

  const updatedPenalties = await prisma.classLog.updateMany({
    where: {
      penaltyNote: { contains: "Attendance never marked" },
    },
    data: {
      penaltyAmount: 0,
      penaltyNote: null,
      penaltyCalculatedAt: new Date() // Keep this so the worker ignores them
    }
  });

  console.log(`Successfully cleared ${updatedPenalties.count} incorrect penalties!`);
}

clearAllBuggyPenalties()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
