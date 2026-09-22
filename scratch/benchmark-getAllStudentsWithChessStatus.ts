import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const start = Date.now();
  const students = await prisma.studentProfile.findMany({
    select: {
      id: true,
      chessComId: true,
      lichessId: true,
      chessAccount: true,
      user: { select: { name: true, email: true, profilePictureUrl: true } },
    },
    orderBy: { user: { name: 'asc' } },
  });
  const ms = Date.now() - start;
  console.log(`getAllStudentsWithChessStatus DB query took ${ms}ms`);
}
run().finally(() => prisma.$disconnect());
