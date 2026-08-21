import { prisma } from '../src/lib/prisma';
import { fetchLichessActivity, fetchLichessGamesInRange, fetchLichessUser } from '../src/services/chess/lichess';
import { fetchChessComStats, fetchChessComArchives, fetchChessComMonthGames } from '../src/services/chess/chesscom';
import { normalizeChessCom, normalizeLichess } from '../src/services/chess/normalizer';
import { aggregate } from '../src/services/chess/aggregator';

async function resyncFlora() {
  const studentProfileId = 'cms058awk000004jlepfh1d01';
  const chessComUsername = 'Floraaheree';
  const lichessUsername = 'Itz_Flora';
  const periodStart = new Date('2026-08-01T00:00:00.000Z');
  const periodEnd = new Date('2026-08-31T23:59:59.999Z');
  const periodType = 'MONTHLY';

  console.log('Starting manual resync for Flora...');

  // Chess.com
  const statsResult = await fetchChessComStats(chessComUsername);
  if (!statsResult.ok) { console.error('CC stats failed:', statsResult.error); return; }

  const archivesResult = await fetchChessComArchives(chessComUsername);
  if (!archivesResult.ok) { console.error('CC archives failed:', archivesResult.error); return; }

  const months = archivesResult.data.archives.filter((url: string) => {
    const [y, m] = url.split('/').slice(-2).map(Number);
    return y === 2026 && m === 8;
  });

  let ccRawGames: any[] = [];
  for (const archiveUrl of months) {
    const gamesResult = await fetchChessComMonthGames(archiveUrl);
    if (gamesResult.ok) {
      ccRawGames = [...ccRawGames, ...gamesResult.data.games.filter((g: any) => {
        const ts = g.end_time * 1000;
        return ts >= periodStart.getTime() && ts <= periodEnd.getTime();
      })];
    }
  }
  console.log(`CC: ${ccRawGames.length} games`);

  const activitySince = new Date(periodEnd);
  activitySince.setDate(activitySince.getDate() - 30);
  const ccActiveDates: string[] = [];
  const chessComActivity = normalizeChessCom(statsResult.data, ccRawGames, chessComUsername, ccActiveDates);

  // Lichess
  const lichessUserResult = await fetchLichessUser(lichessUsername);
  if (!lichessUserResult.ok) { console.error('LI user failed:', lichessUserResult.error); return; }

  const lichessGamesResult = await fetchLichessGamesInRange(lichessUsername, periodStart, periodEnd);
  if (!lichessGamesResult.ok) { console.error('LI games failed:', lichessGamesResult.error); return; }

  const lichessActivityResult = await fetchLichessActivity(lichessUsername);
  if (!lichessActivityResult.ok) { console.error('LI activity failed:', lichessActivityResult.error); return; }

  console.log(`LI: ${lichessGamesResult.data.length} games, ${lichessActivityResult.data.length} activity days`);

  const lichessActivity = normalizeLichess(
    lichessUserResult.data,
    lichessGamesResult.data,
    lichessActivityResult.data,
    periodStart,
    periodEnd,
    activitySince
  );

  console.log(`Puzzles: ${lichessActivity.puzzleSolved}/${lichessActivity.puzzleAttempts}`);

  const combined = aggregate(chessComActivity, lichessActivity);

  const prevSnapshot = await prisma.chessActivitySnapshot.findFirst({
    where: { studentProfileId, periodType: 'MONTHLY', periodStart: new Date('2026-07-01T00:00:00.000Z') }
  });

  const rapidRatingStart = combined.rapidRatingStart ?? prevSnapshot?.rapidRatingEnd ?? combined.rapidRating ?? null;

  const snap = await prisma.chessActivitySnapshot.upsert({
    where: { studentProfileId_periodType_periodStart: { studentProfileId, periodType, periodStart } },
    create: {
      studentProfileId, periodType, periodStart, periodEnd,
      rapidGames: combined.rapidGames,
      blitzGames: combined.blitzGames,
      classicalGames: combined.classicalGames,
      bulletGames: combined.bulletGames,
      ultraBulletGames: combined.ultraBulletGames,
      rapidWins: combined.rapidWins,
      blitzWins: combined.blitzWins,
      classicalWins: combined.classicalWins,
      puzzleAttempts: combined.puzzleAttempts,
      puzzleSolved: combined.puzzleSolved,
      rapidRatingStart,
      rapidRatingEnd: combined.rapidRating,
      streakDays: combined.streakDays,
    },
    update: {
      rapidGames: combined.rapidGames,
      blitzGames: combined.blitzGames,
      classicalGames: combined.classicalGames,
      bulletGames: combined.bulletGames,
      ultraBulletGames: combined.ultraBulletGames,
      rapidWins: combined.rapidWins,
      blitzWins: combined.blitzWins,
      classicalWins: combined.classicalWins,
      puzzleAttempts: combined.puzzleAttempts,
      puzzleSolved: combined.puzzleSolved,
      rapidRatingEnd: combined.rapidRating,
      streakDays: combined.streakDays,
    }
  });

  console.log('\n=== Updated Snapshot ===');
  console.log(`rapidGames: ${snap.rapidGames}, blitzGames: ${snap.blitzGames}`);
  console.log(`puzzleSolved: ${snap.puzzleSolved}/${snap.puzzleAttempts}`);
  console.log(`streakDays: ${snap.streakDays}`);
}

resyncFlora().catch(console.error).finally(() => prisma.$disconnect());
