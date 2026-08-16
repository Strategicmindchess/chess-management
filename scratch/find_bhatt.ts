import { prisma } from '../src/lib/prisma';

async function main() {
  const students = await prisma.studentProfile.findMany({
    where: {
      OR: [
        { user: { name: { contains: 'Flora', mode: 'insensitive' } } },
        { user: { name: { contains: 'Fiona', mode: 'insensitive' } } },
        { chessComId: { contains: 'Flora', mode: 'insensitive' } },
        { lichessId: { contains: 'Flora', mode: 'insensitive' } },
      ]
    },
    include: {
      user: { select: { name: true } },
    }
  });

  console.log(JSON.stringify(students, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
