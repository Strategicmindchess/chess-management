import { fetchChessComStats, fetchChessComArchives, fetchChessComMonthGames, fetchChessComActivity } from '../src/services/chess/chesscom';
import { fetchLichessUser, fetchLichessActivity, fetchLichessGamesInRange } from '../src/services/chess/lichess';
import { getCurrentPeriod } from '../src/lib/leaderboard-period';

async function main() {
  const chessComUsername = 'Floraaheree'; 
  const lichessUsername = 'Itz_Flora'; 
  const { periodStart, periodEnd } = getCurrentPeriod('MONTHLY'); 

  console.log('--- FETCHING RAW DATA FOR FLORA ---');
  
  // Chess.com
  let chessComStats = null;
  try {
    chessComStats = await fetchChessComStats(chessComUsername);
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
    chessComStats: chessComStats ? { tactics: chessComStats.tactics, lessons: chessComStats.lessons, puzzle_rush: chessComStats.puzzle_rush } : null,
    lichessUser: lichessUser ? { puzzle: lichessUser.perfs?.puzzle } : null
  }, null, 2));

}

main().catch(console.error);
