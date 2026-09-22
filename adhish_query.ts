import { PrismaClient } from './src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

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
