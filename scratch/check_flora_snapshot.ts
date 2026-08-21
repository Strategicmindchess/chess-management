import { prisma } from '../src/lib/prisma';

async function main() {
  const user = await prisma.user.findFirst({
    where: { name: { contains: 'Flora', mode: 'insensitive' } }
  });

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user!.id }
  });

  const snapshot = await prisma.chessActivitySnapshot.findFirst({
    where: {
      studentProfileId: profile!.id,
      periodType: 'MONTHLY',
      periodStart: new Date('2026-08-01T00:00:00.000Z')
    }
  });

  console.log("Snapshot for August 2026:", snapshot);
}

main().catch(console.error).finally(() => prisma.$disconnect());
