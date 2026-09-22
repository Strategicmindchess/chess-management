import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  const logs = await prisma.classLog.findMany({
    where: {
      penaltyNote: {
        contains: 'Late join'
      }
    },
    select: { id: true, penaltyAmount: true, penaltyNote: true }
  });
  console.log("Logs with 'Late join':", logs);

  const logsWithPenalty = await prisma.classLog.findMany({
    where: { penaltyAmount: { gt: 0 } },
    select: { id: true, penaltyAmount: true, penaltyNote: true }
  });
  console.log("Logs with penaltyAmount > 0:", logsWithPenalty);
}

main().finally(() => prisma.$disconnect());
