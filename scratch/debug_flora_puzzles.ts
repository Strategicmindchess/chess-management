import { fetchLichessActivity } from '../src/services/chess/lichess';

async function debugFloraPuzzles() {
  const result = await fetchLichessActivity('Itz_Flora');
  
  if (!result.ok) {
    console.log("FAILED:", result.error, result.status);
    return;
  }

  const periodStart = new Date('2026-08-01T00:00:00.000Z');
  const periodEnd = new Date('2026-08-31T23:59:59.999Z');
  const periodStartMs = periodStart.getTime();
  const periodEndMs = periodEnd.getTime();

  console.log(`Total activity days returned: ${result.data.length}`);
  
  let puzzleTotal = 0;
  let puzzleSolvedTotal = 0;
  
  for (const entry of result.data) {
    const ts = entry.interval?.start;
    const dateStr = ts ? new Date(ts).toISOString().split('T')[0] : 'unknown';
    
    if (!ts || ts < periodStartMs || ts > periodEndMs) {
      if (entry.puzzles) {
        console.log(`  [SKIPPED - outside period] ${dateStr}: ${entry.puzzles.score.win + entry.puzzles.score.loss} puzzles`);
      }
      continue;
    }
    
    if (entry.puzzles) {
      const { win, loss, draw } = entry.puzzles.score;
      puzzleTotal += win + loss + draw;
      puzzleSolvedTotal += win;
      console.log(`  [IN PERIOD] ${dateStr}: ${win}W ${loss}L (ts=${ts}, periodStartMs=${periodStartMs})`);
    }
  }

  console.log(`\nFinal: puzzleAttempts=${puzzleTotal}, puzzleSolved=${puzzleSolvedTotal}`);
}

debugFloraPuzzles().catch(console.error);
