/**
 * Debug: Trijal's Lichess puzzle data
 * Lichess username: TrijalPanday
 */

const LICHESS_USERNAME = 'TrijalPanday';

async function main() {
  // ── STEP 1: Fetch Activity ──
  console.log(`=== Fetching Lichess activity for ${LICHESS_USERNAME} ===`);
  const activityUrl = `https://lichess.org/api/user/${LICHESS_USERNAME}/activity`;

  const resp = await fetch(activityUrl, {
    headers: {
      'User-Agent': 'SMC-CRM/1.0 (chess@strategicmindchess.in)',
      'Accept': 'application/json'
    }
  });

  if (!resp.ok) {
    console.error(`❌ Fetch failed: ${resp.status} ${resp.statusText}`);
    return;
  }

  const activity: any[] = await resp.json();
  console.log(`Total activity entries from Lichess: ${activity.length}`);

  if (activity.length > 0) {
    const first = new Date(activity[activity.length - 1].interval?.start);
    const last = new Date(activity[0].interval?.start);
    console.log(`Date range covered: ${first.toISOString().slice(0,10)} → ${last.toISOString().slice(0,10)}`);
  }

  // ── STEP 2: ALL puzzle data per day ──
  console.log('\n=== ALL DAILY PUZZLE ENTRIES (from Lichess) ===');
  let totalAttempts = 0;
  let totalSolved = 0;

  for (const entry of activity) {
    const ts = entry.interval?.start;
    if (!ts) continue;
    const dateStr = new Date(ts + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10); // IST
    if (entry.puzzles) {
      const score = entry.puzzles.score;
      const win = score?.win ?? 0;
      const loss = score?.loss ?? 0;
      const draw = score?.draw ?? 0;
      const dayAttempts = win + loss + draw;
      const ratingBefore = score?.rp?.before ?? '?';
      const ratingAfter = score?.rp?.after ?? '?';
      totalAttempts += dayAttempts;
      totalSolved += win;
      console.log(`  ${dateStr}: ${dayAttempts} puzzles played (W:${win} L:${loss} D:${draw}) | Rating: ${ratingBefore}→${ratingAfter}`);
    }
  }

  console.log(`\n--- TOTALS across all ${activity.length} activity days ---`);
  console.log(`  Total Puzzle Attempts  : ${totalAttempts}`);
  console.log(`  Total Puzzles Solved   : ${totalSolved}`);
  console.log(`  Overall Success Rate   : ${totalAttempts > 0 ? Math.round(totalSolved / totalAttempts * 100) : 0}%`);

  // ── STEP 3: August 2026 period specifically ──
  const periodStart = new Date('2026-08-01T00:00:00.000Z').getTime();
  const periodEnd   = new Date('2026-08-31T23:59:59.999Z').getTime();
  // activitySince = periodEnd - 30 days (our system's filter)
  const activitySinceMs = periodEnd - 30 * 86400 * 1000;

  console.log(`\n=== AUGUST 2026 PUZZLES (what should be counted) ===`);
  let augAttempts = 0, augSolved = 0;
  for (const entry of activity) {
    const ts = entry.interval?.start;
    if (!ts || ts < periodStart || ts > periodEnd) continue;
    if (entry.puzzles) {
      const score = entry.puzzles.score;
      augAttempts += (score?.win ?? 0) + (score?.loss ?? 0) + (score?.draw ?? 0);
      augSolved   += score?.win ?? 0;
    }
  }
  console.log(`  August attempts: ${augAttempts}`);
  console.log(`  August solved  : ${augSolved}`);
  console.log(`  System shows   : 169 solved (from screenshot)`);
  console.log(`  Difference     : ${augSolved - 169} puzzles missing from system`);

  // ── STEP 4: Check activitySince filter our code applies ──
  console.log(`\n=== SYSTEM activitySince WINDOW FILTER ===`);
  console.log(`  activitySince = ${new Date(activitySinceMs).toISOString().slice(0,10)} (periodEnd - 30 days)`);
  console.log(`  periodStart   = ${new Date(periodStart).toISOString().slice(0,10)}`);
  let windowAttempts = 0, windowSolved = 0;
  let skippedBefore = 0;
  for (const entry of activity) {
    const ts = entry.interval?.start;
    if (!ts) continue;
    // This is the exact filter in normalizer.ts L214
    if (ts < activitySinceMs || ts > periodEnd) { skippedBefore++; continue; }
    if (entry.puzzles && ts >= periodStart) {
      const score = entry.puzzles.score;
      windowAttempts += (score?.win ?? 0) + (score?.loss ?? 0) + (score?.draw ?? 0);
      windowSolved   += score?.win ?? 0;
    }
  }
  console.log(`  Entries skipped (outside window): ${skippedBefore}`);
  console.log(`  Window puzzles: ${windowAttempts} attempts, ${windowSolved} solved`);

  // ── STEP 5: Lichess user profile (lifetime stats) ──
  console.log(`\n=== LICHESS PROFILE (lifetime) ===`);
  const userResp = await fetch(`https://lichess.org/api/user/${LICHESS_USERNAME}`, {
    headers: { 'User-Agent': 'SMC-CRM/1.0', 'Accept': 'application/json' }
  });
  if (userResp.ok) {
    const user: any = await userResp.json();
    console.log(`  Puzzle Rating    : ${user?.perfs?.puzzle?.rating ?? 'N/A'}`);
    console.log(`  Puzzle Games     : ${user?.perfs?.puzzle?.games ?? 0} (all-time total)`);
    console.log(`  Rapid Rating     : ${user?.perfs?.rapid?.rating ?? 'N/A'} (${user?.perfs?.rapid?.games ?? 0} games)`);
    console.log(`  Blitz Rating     : ${user?.perfs?.blitz?.rating ?? 'N/A'} (${user?.perfs?.blitz?.games ?? 0} games)`);
  }
}

main().catch(console.error);
