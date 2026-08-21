async function main() {
  const username = 'Itz_Flora';
  const url = `https://lichess.org/api/user/${username}/activity`;
  
  console.log(`Fetching activity for ${username} from ${url}...`);
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'SMC-CRM/1.0 (chess@strategicmindchess.in)',
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    console.error(`Failed to fetch: ${response.status} ${response.statusText}`);
    return;
  }

  const activity = await response.json();
  
  // Period for August 2026
  const periodStart = new Date('2026-08-01T00:00:00.000Z').getTime();
  const periodEnd = new Date('2026-08-31T23:59:59.999Z').getTime();

  console.log(`Looking for puzzle activity between ${new Date(periodStart).toISOString()} and ${new Date(periodEnd).toISOString()}`);
  
  let totalAttempts = 0;
  let totalSolved = 0;

  for (const entry of activity) {
    const ts = entry.interval?.start;
    if (!ts) continue;

    if (ts >= periodStart && ts <= periodEnd) {
      if (entry.puzzles) {
        console.log(`Found puzzles on ${new Date(ts).toISOString()}:`, entry.puzzles);
        const score = entry.puzzles.score;
        totalAttempts += score.win + score.loss + score.draw;
        totalSolved += score.win;
      }
    }
  }

  console.log(`\nResults for August 2026:`);
  console.log(`Total Puzzle Attempts on Lichess: ${totalAttempts}`);
  console.log(`Total Puzzles Solved on Lichess: ${totalSolved}`);
}

main().catch(console.error);
