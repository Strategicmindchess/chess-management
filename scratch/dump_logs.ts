import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.classLog.findMany({
    include: {
      batch: true,
      classInstance: true,
      coach: { include: { user: true } },
      classFeedbacks: true,
    }
  });

  console.log(JSON.stringify(logs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
