import { prisma } from "../src/lib/prisma";

async function checkClassLogs() {
  console.log("Fetching class logs for 'Core 2 IND-GC2-102'...\n");

  const logs = await prisma.classLog.findMany({
    where: {
      batch: { name: { contains: "Core 2 IND-GC2-102" } }
    },
    include: {
      batch: true,
      classInstance: true
    },
    orderBy: { date: "desc" },
    take: 5
  });

  if (logs.length === 0) {
    console.log("No class logs found for this batch.");
    return;
  }

  logs.forEach(log => {
    console.log("---------------------------------------------------");
    console.log(`Class Log ID: ${log.id}`);
    console.log(`Date of Class: ${log.date}`);
    console.log(`Batch: ${log.batch.name} (${log.batch.code})`);
    console.log(`Class Instance Completed At: ${log.classInstance?.completedAt}`);
    console.log(`Class Log Created At: ${log.createdAt}`);
    console.log(`Attendance Marked At: ${log.attendanceMarkedAt}`);
    console.log(`Coach Joined At: ${log.coachJoinedAt}`);
    console.log(`Penalty Amount: ₹${log.penaltyAmount}`);
    console.log(`Penalty Note: ${log.penaltyNote}`);
    console.log(`Penalty Calculated At: ${log.penaltyCalculatedAt}`);
    console.log("---------------------------------------------------\n");
  });
}

checkClassLogs()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
