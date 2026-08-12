const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.classLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      batch: { select: { name: true, level: true } },
      classInstance: { select: { sessionNumber: true } }
    }
  });
  console.log(JSON.stringify(logs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
