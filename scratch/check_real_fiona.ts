import { fetchChessComArchives, fetchChessComMonthGames, fetchChessComStats } from '../src/services/chess/chesscom';
import { fetchLichessActivity, fetchLichessGamesInRange, fetchLichessUser } from '../src/services/chess/lichess';

async function checkRealFiona() {
  console.log('=== Checking Real Fiona Stats from APIs ===\n');

  // 1. Chess.com
  const ccUser = 'Fionaprincess1';
  const ccStats = await fetchChessComStats(ccUser);
  console.log('Chess.com Stats:');
  console.log('Rapid rating:', ccStats.data?.chess_rapid?.last?.rating);
  console.log('Blitz rating:', ccStats.data?.chess_blitz?.last?.rating);

  const ccArchives = await fetchChessComArchives(ccUser);
  const augArchive = ccArchives.data?.find((a: string) => a.includes('2026/08'));
  let ccAugGames: any[] = [];
  if (augArchive) {
    const gamesRes = await fetchChessComMonthGames(augArchive);
    ccAugGames = gamesRes.data?.games || [];
  }
  console.log(`Chess.com August Games: ${ccAugGames.length}`);

  let ccRapid = 0, ccBlitz = 0, ccRapidWins = 0, ccBlitzWins = 0;
  for (const g of ccAugGames) {
    const isWhite = g.white.username.toLowerCase() === ccUser.toLowerCase();
    const player = isWhite ? g.white : g.black;
    const isWin = player.result === 'win';
    if (g.time_class === 'rapid') {
      ccRapid++;
      if (isWin) ccRapidWins++;
    } else if (g.time_class === 'blitz') {
      ccBlitz++;
      if (isWin) ccBlitzWins++;
    }
  }
  console.log(`  CC Rapid: ${ccRapid} (${ccRapidWins} wins), Blitz: ${ccBlitz} (${ccBlitzWins} wins)`);

  // 2. Lichess
  const liUser = 'FIONA12345678';
  const liUserRes = await fetchLichessUser(liUser);
  console.log('\nLichess Stats:');
  console.log('Rapid rating:', liUserRes.data?.perfs?.rapid?.rating);
  console.log('Blitz rating:', liUserRes.data?.perfs?.blitz?.rating);

  const pStart = new Date('2026-08-01T00:00:00.000Z');
  const pEnd = new Date('2026-08-31T23:59:59.999Z');
  const liGamesRes = await fetchLichessGamesInRange(liUser, pStart, pEnd);
  const liGames = liGamesRes.data || [];
  console.log(`Lichess August Games: ${liGames.length}`);

  let liRapid = 0, liBlitz = 0, liRapidWins = 0, liBlitzWins = 0;
  for (const g of liGames) {
    const isWhite = (g.players as any)?.white?.user?.name?.toLowerCase() === liUser.toLowerCase();
    const isWin = (g as any).winner === (isWhite ? 'white' : 'black');
    const speed = (g as any).speed;
    if (speed === 'rapid') {
      liRapid++;
      if (isWin) liRapidWins++;
    } else if (speed === 'blitz') {
      liBlitz++;
      if (isWin) liBlitzWins++;
    }
  }
  console.log(`  LI Rapid: ${liRapid} (${liRapidWins} wins), Blitz: ${liBlitz} (${liBlitzWins} wins)`);

  const liActRes = await fetchLichessActivity(liUser);
  const act = liActRes.data || [];
  console.log(`\nLichess Activity Entries: ${act.length} days`);
  let totalPuzzles = 0, totalSolved = 0;
  for (const entry of act) {
    const ts = entry.interval?.start;
    if (ts && ts >= pStart.getTime() && ts <= pEnd.getTime()) {
      if (entry.puzzles) {
        const { win, loss, draw } = entry.puzzles.score;
        const attempts = win + loss + (draw || 0);
        totalPuzzles += attempts;
        totalSolved += win;
        const d = new Date(ts).toISOString().split('T')[0];
        console.log(`  ${d}: ${win} solved / ${attempts} attempts`);
      }
    }
  }
  console.log(`Total August Lichess Puzzles: ${totalSolved} solved / ${totalPuzzles} attempts`);
  console.log(`Accuracy: ${((totalSolved / totalPuzzles) * 100).toFixed(1)}%`);

  console.log('\n=== COMBINED REAL TOTALS ===');
  console.log(`Rapid Games: ${ccRapid + liRapid}`);
  console.log(`Blitz Games: ${ccBlitz + liBlitz}`);
  console.log(`Total Games (Rapid + Blitz): ${ccRapid + liRapid + ccBlitz + liBlitz}`);
  console.log(`Total Wins: ${ccRapidWins + liRapidWins + ccBlitzWins + liBlitzWins}`);
  const winRate = ((ccRapidWins + liRapidWins + ccBlitzWins + liBlitzWins) / (ccRapid + liRapid + ccBlitz + liBlitz)) * 100;
  console.log(`Real Win Rate: ${winRate.toFixed(1)}%`);
  console.log(`Puzzles: ${totalSolved} solved / ${totalPuzzles} attempts (${((totalSolved / totalPuzzles) * 100).toFixed(1)}% acc)`);
}

checkRealFiona().catch(console.error);
