import { fetchLichessActivity } from '../src/services/chess/lichess';
import { getCurrentPeriod } from '../src/lib/leaderboard-period';

async function main() {
  const period = getCurrentPeriod('MONTHLY');
  const { periodStart, periodEnd } = period;
  
  const lichessUser = 'FIONA12345678';
  
  console.log(`Period: ${periodStart.toISOString()} → ${periodEnd.toISOString()}`);
  console.log(`periodStart ms: ${periodStart.getTime()}`);

  const activity = await fetchLichessActivity(lichessUser);
  
  console.log(`\nTotal activity entries from Lichess: ${activity.length}`);
  console.log(`\nEntries with puzzles:`);
  
  let totalAttempts = 0, totalSolved = 0;
  let inPeriodAttempts = 0, inPeriodSolved = 0;
  
  for (const entry of activity) {
    const ts = entry.interval?.start;
    if (!ts) continue;
    
    const d = new Date(ts);
    const dateStr = d.toISOString().slice(0, 10);
    
    if (entry.puzzles) {
      const score = entry.puzzles.score;
      const attempts = score.win + score.loss + score.draw;
      const solved = score.win;
      totalAttempts += attempts;
      totalSolved += solved;
      
      const inPeriod = ts >= periodStart.getTime() && ts <= periodEnd.getTime();
      if (inPeriod) {
        inPeriodAttempts += attempts;
        inPeriodSolved += solved;
      }
      
      console.log(`  Date: ${dateStr} | Attempts: ${attempts} | Solved: ${solved} | InPeriod: ${inPeriod}`);
    }
  }
  
  console.log(`\n--- SUMMARY ---`);
  console.log(`Lifetime total puzzles: ${totalSolved}/${totalAttempts}`);
  console.log(`August-only puzzles:    ${inPeriodSolved}/${inPeriodAttempts}`);
}

main().catch(console.error);
