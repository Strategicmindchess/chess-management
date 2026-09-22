import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0); // Start of today (UTC)

  const logs = await prisma.classLog.findMany({
    where: {
      createdAt: {
        gte: todayStart,
      },
    },
    include: {
      batch: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' }
  });

  if (logs.length === 0) {
    console.log("No class logs were created today.");
  } else {
    console.log(`Found ${logs.length} class log(s) created today:`);
    for (const log of logs) {
      console.log(`- Batch: ${log.batch.name}`);
      console.log(`  Class Date: ${log.date.toISOString()}`);
      console.log(`  Coach Joined At: ${log.coachJoinedAt?.toISOString() || 'N/A'}`);
      console.log(`  Attendance Marked: ${log.attendanceMarkedAt?.toISOString() || 'N/A'}`);
      console.log(`  Created At: ${log.createdAt.toISOString()}`);
      console.log('---');
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
