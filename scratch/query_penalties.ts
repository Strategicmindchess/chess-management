import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.classLog.findMany({
    where: {
      penaltyAmount: 500
    },
    include: {
      classInstance: true
    },
    take: 10
  });

  for (const log of logs) {
    console.log(`Log ID: ${log.id}`);
    console.log(`Batch: ${log.batchId}`);
    console.log(`Scheduled: ${log.classInstance?.date} ${log.classInstance?.startTime}`);
    console.log(`Coach Joined At: ${log.coachJoinedAt}`);
    console.log(`Penalty Amount: ${log.penaltyAmount}`);
    console.log(`Penalty Note: ${log.penaltyNote}`);
    console.log('---');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
