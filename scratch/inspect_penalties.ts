import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.classLog.findMany({
    where: {
      penaltyAmount: { gt: 0 }
    },
    include: {
      coach: { include: { user: true } },
      batch: true,
      classInstance: true
    }
  });

  console.log(JSON.stringify(logs.map(l => ({
    id: l.id,
    coach: l.coach.user.name,
    batch: l.batch.name,
    date: l.date,
    amount: l.penaltyAmount,
    note: l.penaltyNote,
    coachJoinedAt: l.coachJoinedAt,
    scheduledStart: l.classInstance?.startTime,
  })), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
