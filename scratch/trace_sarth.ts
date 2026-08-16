import { fetchLichessUser, fetchLichessActivity, fetchLichessGamesInRange } from '../src/services/chess/lichess';
import { normalizeLichess } from '../src/services/chess/normalizer';
import { getCurrentPeriod } from '../src/lib/leaderboard-period';

async function main() {
  const lichessUsername = 'Sarthchoudhary1'; 
  const { periodStart, periodEnd } = getCurrentPeriod('MONTHLY'); 

  console.log('--- NORMALIZING LICHESS FOR SARTH ---');
  
  const fetchedUser = await fetchLichessUser(lichessUsername);
  const lichessGames = await fetchLichessGamesInRange(lichessUsername, periodStart, periodEnd);
  const lichessActivityRaw = await fetchLichessActivity(lichessUsername);

  const thirtyFiveDaysAgo = new Date();
  thirtyFiveDaysAgo.setDate(thirtyFiveDaysAgo.getDate() - 35);
  const activitySince = thirtyFiveDaysAgo < periodStart ? thirtyFiveDaysAgo : periodStart;

  const lichessActivity = normalizeLichess(
    fetchedUser,
    lichessGames,
    lichessActivityRaw,
    periodStart,
    periodEnd,
    activitySince
  );

  console.log(JSON.stringify(lichessActivity, null, 2));
}

main().catch(console.error);
