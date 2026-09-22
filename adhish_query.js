const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { name: { contains: 'Adhish', mode: 'insensitive' } },
    include: {
      studentProfile: {
        include: {
          chessAccount: true,
          leaderboardEntries: {
            orderBy: { periodStart: 'desc' },
            take: 2,
          }
        }
      }
    }
  });
  console.log(JSON.stringify(user, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
