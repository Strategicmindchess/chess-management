const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      name: { contains: 'nikilesh', mode: 'insensitive' }
    },
    include: {
      studentProfile: {
        include: {
          chessAccount: true,
          chessActivitySnapshots: true,
          leaderboardScores: true
        }
      }
    }
  });

  console.dir(users, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());
