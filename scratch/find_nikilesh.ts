import { prisma } from '../src/lib/prisma';

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: 'nikhilesh', mode: 'insensitive' } },
        { studentProfile: { chessAccount: { chessComUsername: { contains: 'nikhilesh', mode: 'insensitive' } } } },
        { studentProfile: { chessAccount: { lichessUsername: { contains: 'nikhilesh', mode: 'insensitive' } } } }
      ]
    },
    include: {
      studentProfile: {
        include: {
          chessAccount: true,
          activitySnapshots: { orderBy: { periodStart: 'desc' }, take: 2 },
          leaderboardEntries: { orderBy: { periodStart: 'desc' }, take: 2 }
        }
      }
    }
  });

  console.dir(users, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());
