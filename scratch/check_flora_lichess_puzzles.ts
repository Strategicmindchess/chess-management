import { fetchLichessActivity } from '../src/services/chess/lichess';

async function checkFloraPuzzles() {
  const periodStart = new Date('2026-08-01T00:00:00.000Z');
  const periodEnd = new Date('2026-08-31T23:59:59.999Z');

  console.log("Fetching Lichess activity for Itz_Flora...");
  const result = await fetchLichessActivity('Itz_Flora');

  if (!result.ok) {
    console.log("FAILED:", result.error);
    return;
  }

  const activity = result.data;
  const periodStartMs = periodStart.getTime();
  const periodEndMs = periodEnd.getTime();

  let totalPuzzleAttempts = 0;
  let totalPuzzleSolved = 0;

  for (const entry of activity) {
    const ts = entry.interval?.start;
    if (!ts || ts < periodStartMs || ts > periodEndMs) continue;

    if (entry.puzzles) {
      const { win, loss, draw } = entry.puzzles.score;
      const attempts = win + loss + draw;
      totalPuzzleAttempts += attempts;
      totalPuzzleSolved += win;
      const date = new Date(ts).toISOString().split('T')[0];
      console.log(`  ${date}: ${win}W ${loss}L ${draw}D (${attempts} puzzles)`);
    }
  }

  console.log(`\nTotal puzzleAttempts: ${totalPuzzleAttempts}`);
  console.log(`Total puzzleSolved: ${totalPuzzleSolved}`);
}

checkFloraPuzzles().catch(console.error);
