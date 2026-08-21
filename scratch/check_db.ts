import { prisma } from '../src/lib/prisma'; // or where prisma is exported

async function main() {
  const entry = await prisma.leaderboardEntry.findFirst({
    where: { student: { user: { name: 'Fiona Bhatt' } } },
    include: { snapshot: true },
    orderBy: { periodStart: 'desc' },
  });

  console.log(JSON.stringify(entry, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
