import { fetchLichessActivity } from '../src/services/chess/lichess';
import { getCurrentPeriod } from '../src/lib/leaderboard-period';

async function main() {
  const lichessUsername = 'Sarthchoudhary1'; 
  const { periodStart, periodEnd } = getCurrentPeriod('MONTHLY'); 

  console.log(`Fetching Lichess Activity for ${lichessUsername}...`);
  try {
    const lichessActivityRaw = await fetchLichessActivity(lichessUsername);
    let puzzleAttempts = 0;
    let puzzleSolved = 0;

    for (const feed of lichessActivityRaw) {
      if (feed.puzzles) {
        puzzleAttempts += feed.puzzles.score.rp.all;
        puzzleSolved += feed.puzzles.score.rp.win;
      }
    }

    console.log(JSON.stringify({
      puzzleAttempts,
      puzzleSolved,
      rawFeeds: lichessActivityRaw.map(f => ({ interval: f.interval, puzzles: f.puzzles }))
    }, null, 2));

  } catch(e: any) {
    console.error('Error fetching lichess activity:', e.message);
  }
}

main().catch(console.error);
