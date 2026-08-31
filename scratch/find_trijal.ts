import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Find Trijal
  const students = await (prisma as any).studentProfile.findMany({
    where: {
      user: {
        name: {
          contains: 'trijal',
          mode: 'insensitive',
        }
      }
    },
    include: {
      user: { select: { name: true, email: true } },
      chessAccount: true,
    }
  });

  console.log('=== STUDENT RECORDS ===');
  console.log(JSON.stringify(students, null, 2));

  if (students.length > 0) {
    const sid = students[0].id;
    const snaps = await (prisma as any).chessActivitySnapshot.findMany({
      where: { studentProfileId: sid },
      orderBy: { periodStart: 'desc' },
      take: 5,
    });
    console.log('\n=== SNAPSHOTS ===');
    console.log(JSON.stringify(snaps, null, 2));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
