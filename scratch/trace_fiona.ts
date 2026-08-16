import { fetchChessComStats, fetchChessComArchives, fetchChessComMonthGames, fetchChessComActivity } from '../src/services/chess/chesscom';
import { fetchLichessUser, fetchLichessActivity, fetchLichessGamesInRange } from '../src/services/chess/lichess';
import { normalizeChessCom, normalizeLichess, extractLifetimeStats } from '../src/services/chess/normalizer';
import { aggregate } from '../src/services/chess/aggregator';
import { getCurrentPeriod } from '../src/lib/leaderboard-period';

async function main() {
  const chessComUsername = 'Fionaprincess1 '; 
  const lichessUsername = 'FIONA12345678'; 
  const { periodStart, periodEnd } = getCurrentPeriod('MONTHLY'); 

  const thirtyFiveDaysAgo = new Date();
  thirtyFiveDaysAgo.setDate(thirtyFiveDaysAgo.getDate() - 35);
  const activitySince = thirtyFiveDaysAgo < periodStart ? thirtyFiveDaysAgo : periodStart;

  console.log('--- 1. FETCHING RAW DATA ---');
  
  // Chess.com
  let chessComStats = null;
  let archives = [];
  try {
    chessComStats = await fetchChessComStats(chessComUsername);
    archives = await fetchChessComArchives(chessComUsername);
  } catch(e: any) {
    console.error('Error fetching chess.com stats:', e.message);
  }

  // Lichess
  let lichessUser = null;
  try {
    lichessUser = await fetchLichessUser(lichessUsername);
  } catch(e: any) {
    console.error('Error fetching lichess user:', e.message);
  }

  console.log(JSON.stringify({
    step: 'RAW_STATS',
    chessComStats,
    lichessUser
  }, null, 2));

}

main().catch(console.error);
