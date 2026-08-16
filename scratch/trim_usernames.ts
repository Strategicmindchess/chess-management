import { prisma } from '../src/lib/prisma';

async function main() {
  const students = await prisma.studentProfile.findMany();
  let updatedCount = 0;

  for (const s of students) {
    const trimmedChess = s.chessComId?.trim() || null;
    const trimmedLichess = s.lichessId?.trim() || null;

    if (trimmedChess !== s.chessComId || trimmedLichess !== s.lichessId) {
      await prisma.studentProfile.update({
        where: { id: s.id },
        data: {
          chessComId: trimmedChess,
          lichessId: trimmedLichess
        }
      });
      console.log(`Trimmed for ${s.id}: '${s.chessComId}' -> '${trimmedChess}', '${s.lichessId}' -> '${trimmedLichess}'`);
      updatedCount++;
    }
  }

  console.log(`Finished. Updated ${updatedCount} profiles.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
