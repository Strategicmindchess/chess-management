import { prisma } from '../src/lib/prisma';

async function main() {
  const periodStart = new Date('2026-08-01T00:00:00.000Z');
  const twoDAysAgo = new Date('2026-08-18T00:00:00.000Z'); // Aug 20 - 2 days

  // Get all active students with chess accounts
  const students = await prisma.studentProfile.findMany({
    where: {
      user: { isActive: true, role: 'STUDENT' },
      OR: [
        { chessComId: { not: null } },
        { lichessId: { not: null } }
      ]
    },
    include: {
      user: { select: { name: true } }
    }
  });

  console.log(`Total active students with chess accounts: ${students.length}\n`);

  // For each student, check their latest ChessApiFetchLog
  const results = [];

  for (const student of students) {
    const [ccLog, liLog, snapshot] = await Promise.all([
      // Latest Chess.com fetch log
      student.chessComId ? prisma.chessApiFetchLog.findFirst({
        where: { studentProfileId: student.id, provider: 'CHESS_COM', periodStart },
        orderBy: { fetchedAt: 'desc' }
      }) : null,
      // Latest Lichess fetch log
      student.lichessId ? prisma.chessApiFetchLog.findFirst({
        where: { studentProfileId: student.id, provider: 'LICHESS', periodStart },
        orderBy: { fetchedAt: 'desc' }
      }) : null,
      // Current snapshot
      prisma.chessActivitySnapshot.findFirst({
        where: { studentProfileId: student.id, periodType: 'MONTHLY', periodStart },
      })
    ]);

    const ccStatus = !student.chessComId ? 'N/A' : 
                     !ccLog ? '❌ NO LOG' :
                     ccLog.success === false ? `❌ FAILED (${ccLog.statusCode})` :
                     ccLog.fetchedAt < twoDAysAgo ? `⚠️  STALE (${ccLog.fetchedAt.toISOString().split('T')[0]})` : '✅ OK';

    const liStatus = !student.lichessId ? 'N/A' : 
                     !liLog ? '❌ NO LOG' :
                     liLog.success === false ? `❌ FAILED (${liLog.statusCode})` :
                     liLog.fetchedAt < twoDAysAgo ? `⚠️  STALE (${liLog.fetchedAt.toISOString().split('T')[0]})` : '✅ OK';

    const puzzles = snapshot?.puzzleSolved ?? 0;
    const snapshotAge = snapshot 
      ? `${Math.floor((Date.now() - snapshot.updatedAt.getTime()) / (1000 * 60 * 60))}h ago`
      : 'NO SNAPSHOT';

    results.push({
      name: student.user.name,
      chessComId: student.chessComId ?? '—',
      lichessId: student.lichessId ?? '—',
      'CC Status': ccStatus,
      'LI Status': liStatus,
      'Puzzles': puzzles,
      'Snapshot': snapshotAge
    });
  }

  // Sort: failed first, then stale, then ok
  results.sort((a, b) => {
    const aScore = (a['CC Status'].startsWith('❌') || a['LI Status'].startsWith('❌')) ? 0 :
                   (a['CC Status'].startsWith('⚠️') || a['LI Status'].startsWith('⚠️')) ? 1 : 2;
    const bScore = (b['CC Status'].startsWith('❌') || b['LI Status'].startsWith('❌')) ? 0 :
                   (b['CC Status'].startsWith('⚠️') || b['LI Status'].startsWith('⚠️')) ? 1 : 2;
    return aScore - bScore;
  });

  console.table(results);

  // Summary
  const failed = results.filter(r => r['CC Status'].startsWith('❌') || r['LI Status'].startsWith('❌'));
  const stale = results.filter(r => 
    (r['CC Status'].startsWith('⚠️') || r['LI Status'].startsWith('⚠️')) &&
    !r['CC Status'].startsWith('❌') && !r['LI Status'].startsWith('❌')
  );
  const ok = results.filter(r => 
    (r['CC Status'] === '✅ OK' || r['CC Status'] === 'N/A') && 
    (r['LI Status'] === '✅ OK' || r['LI Status'] === 'N/A')
  );

  console.log('\n======== SUMMARY ========');
  console.log(`✅ Up to date:  ${ok.length}`);
  console.log(`⚠️  Stale data: ${stale.length}`);
  console.log(`❌ Failed:      ${failed.length}`);
  if (failed.length > 0) {
    console.log('\nFailed students:');
    failed.forEach(s => console.log(`  - ${s.name} | CC: ${s['CC Status']} | LI: ${s['LI Status']}`));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
