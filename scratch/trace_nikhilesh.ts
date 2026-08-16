import { fetchChessComStats, fetchChessComArchives, fetchChessComMonthGames, fetchChessComActivity } from '../src/services/chess/chesscom';
import { fetchLichessUser, fetchLichessActivity, fetchLichessGamesInRange } from '../src/services/chess/lichess';
import { normalizeChessCom, normalizeLichess, extractLifetimeStats } from '../src/services/chess/normalizer';
import { aggregate } from '../src/services/chess/aggregator';
import { getCurrentPeriod } from '../src/lib/leaderboard-period';

async function main() {
  const chessComUsername = 'Nikhilesh39'; 
  const lichessUsername = 'Nikhilesh_999'; 
  const { periodStart, periodEnd } = getCurrentPeriod('MONTHLY'); 

  const thirtyFiveDaysAgo = new Date();
  thirtyFiveDaysAgo.setDate(thirtyFiveDaysAgo.getDate() - 35);
  const activitySince = thirtyFiveDaysAgo < periodStart ? thirtyFiveDaysAgo : periodStart;

  console.log('--- 1. FETCHING RAW DATA ---');
  
  // Chess.com
  const chessComStats = await fetchChessComStats(chessComUsername);
  const archives = await fetchChessComArchives(chessComUsername);
  console.log('Chesscom raw game stats:');
  console.log(JSON.stringify(chessComStats, null, 2));
  console.log('Chesscom archives:', archives);

  let chessComRawGames: any[] = [];
  const monthsNeeded = new Set<string>();
  const cur = new Date(periodStart);
  while (cur <= periodEnd) {
    monthsNeeded.add(`${cur.getFullYear()}/${String(cur.getMonth() + 1).padStart(2, '0')}`);
    cur.setDate(cur.getDate() + 1);
  }
  for (const archiveUrl of archives) {
    const monthKey = archiveUrl.split('/').slice(-2).join('/');
    if (!monthsNeeded.has(monthKey)) continue;
    const games = await fetchChessComMonthGames(archiveUrl);
    const filtered = games.filter((g: any) => {
      const d = new Date(g.end_time * 1000);
      return d >= periodStart && d <= periodEnd;
    });
    chessComRawGames.push(...filtered);
  }
  const { fetchChessComTrueStreakDates } = require('../src/services/chess/chesscom');
  const ccActiveDates = await fetchChessComTrueStreakDates(chessComUsername);

  // Lichess
  const lichessUser = await fetchLichessUser(lichessUsername);
  const lichessGames = await fetchLichessGamesInRange(lichessUsername, periodStart, periodEnd);
  const lichessActivityRaw = await fetchLichessActivity(lichessUsername);

  console.log(JSON.stringify({
    step: 'RAW',
    chessCom: { stats: chessComStats, gameCount: chessComRawGames.length, activeDates: ccActiveDates.length },
    lichess: { user: lichessUser?.perfs, gameCount: lichessGames.length, activityLength: lichessActivityRaw.length }
  }, null, 2));

  console.log('\n--- 2. NORMALIZING ---');
  const chessComActivity = normalizeChessCom(chessComStats, chessComRawGames, chessComUsername, ccActiveDates);
  const lichessActivity = normalizeLichess(lichessUser, lichessGames, lichessActivityRaw, periodStart, periodEnd, activitySince);

  console.log(JSON.stringify({
    step: 'NORMALIZED',
    chessCom: chessComActivity,
    lichess: lichessActivity
  }, null, 2));

  console.log('\n--- 3. EXTRACT LIFETIME STATS ---');
  const lifetimeStats = extractLifetimeStats(
    chessComStats,
    lichessUser,
    chessComActivity?.activeDates ?? [],
    lichessActivity?.activeDates ?? []
  );
  console.log(JSON.stringify({ step: 'LIFETIME', stats: lifetimeStats }, null, 2));

  console.log('\n--- 4. AGGREGATING ---');
  const combined = aggregate(chessComActivity, lichessActivity);
  
  console.log(JSON.stringify({
    step: 'AGGREGATED',
    combined
  }, null, 2));
}

main().catch(console.error);
