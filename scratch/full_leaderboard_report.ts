/**
 * full_leaderboard_report.ts
 *
 * One script to rule them all:
 *  1. Sync attendance (LeaderboardAttendance) for ALL students this month
 *  2. Sync assignment scores (AssignmentScore) for ALL students this month
 *  3. Fetch LIVE Lichess activity per student to compute fresh streak
 *  4. Compute detailed score breakdown for every student
 *  5. Print ranked summary table + full per-student breakdown you can cross-check
 *
 * Run:  npx tsx --env-file=.env scratch/full_leaderboard_report.ts
 */

import { prisma } from '../src/lib/prisma';
import { getCurrentPeriod } from '../src/lib/leaderboard-period';
import { fetchLichessActivity } from '../src/services/chess/lichess';
import { calcStreak, epochToISTDateStr } from '../src/services/chess/aggregator';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// ─── Scoring Functions ────────────────────────────────────────────────────────

function calcScores(snap: {
  rapidGames: number; classicalGames: number; blitzGames: number;
  rapidWins: number; blitzWins: number;
  puzzleAttempts: number; puzzleSolved: number;
  rapidRatingStart: number | null; rapidRatingEnd: number | null;
  bulletGames: number; ultraBulletGames: number;
}, streakDays: number) {
  const rapidClassicalGames = snap.rapidGames + snap.classicalGames;
  const rapidClassicalPoints = Math.min(rapidClassicalGames * 2, 174);
  const blitzPoints = Math.min(snap.blitzGames, 51);

  const puzzlePoints = Math.min(snap.puzzleSolved * 0.5, 225);

  const totalGames = snap.rapidGames + snap.blitzGames;
  const totalWins = snap.rapidWins + snap.blitzWins;
  const winRate = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;
  const winRateBonus = totalGames >= 10 ? (winRate >= 50 ? 75 : -50) : 0;

  const puzzleSuccessRate = snap.puzzleAttempts > 0
    ? (snap.puzzleSolved / snap.puzzleAttempts) * 100 : 0;
  const puzzleAccBonus = snap.puzzleAttempts >= 20
    ? (puzzleSuccessRate >= 70 ? 50 : -25) : 0;

  const ratingDiff = (snap.rapidRatingEnd ?? 0) - (snap.rapidRatingStart ?? 0);
  let ratingBonus = 0;
  if (ratingDiff >= 200) ratingBonus = 100;
  else if (ratingDiff >= 150) ratingBonus = 75;
  else if (ratingDiff >= 100) ratingBonus = 50;
  else if (ratingDiff >= 50) ratingBonus = 25;

  let streakBonus = 0;
  if (streakDays >= 30) streakBonus = 25;
  else if (streakDays >= 21) streakBonus = 15;
  else if (streakDays >= 14) streakBonus = 10;
  else if (streakDays >= 7) streakBonus = 5;

  const bulletTotal = snap.bulletGames + snap.ultraBulletGames;
  const bulletPenalty = bulletTotal > 50 ? -200 : 0;

  return {
    rapidClassicalGames, rapidClassicalPoints,
    blitzGames: snap.blitzGames, blitzPoints,
    puzzleSolved: snap.puzzleSolved, puzzleAttempts: snap.puzzleAttempts, puzzlePoints,
    totalGames, totalWins, winRate, winRateBonus,
    puzzleSuccessRate, puzzleAccBonus,
    rapidRatingStart: snap.rapidRatingStart ?? 0,
    rapidRatingEnd: snap.rapidRatingEnd ?? 0,
    ratingDiff, ratingBonus,
    streakDays, streakBonus,
    bulletTotal, bulletPenalty,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const period = getCurrentPeriod('MONTHLY');
  const { periodStart, periodEnd } = period;

  const todayIST = epochToISTDateStr(Date.now());
  const periodLabel = periodStart.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const line  = '='.repeat(72);
  const thin  = '─'.repeat(72);

  console.log(`\n${line}`);
  console.log(` FULL LEADERBOARD REPORT  —  ${periodLabel}`);
  console.log(` Period : ${periodStart.toISOString()} → ${periodEnd.toISOString()}`);
  console.log(` Today  : ${todayIST} (IST)`);
  console.log(`${line}\n`);

  // ── Step 1: All active students ──────────────────────────────────────────
  const allStudents = await prisma.studentProfile.findMany({
    where: { user: { isActive: true, role: 'STUDENT' } },
    include: {
      user: { select: { name: true, email: true } },
      chessAccount: { select: { chessComUsername: true, lichessUsername: true } },
    },
    orderBy: { user: { name: 'asc' } },
  });
  const studentIds = allStudents.map(s => s.id);
  console.log(`[STEP 1] ${allStudents.length} active students found.\n`);

  // ── Step 2: Sync Attendance ──────────────────────────────────────────────
  console.log(`[STEP 2] Syncing attendance...`);
  const attRecords = await prisma.attendanceRecord.findMany({
    where: { studentProfileId: { in: studentIds }, classLog: { date: { gte: periodStart, lte: periodEnd } } },
    select: { studentProfileId: true, status: true },
  });
  const attMap = new Map<string, { total: number; present: number }>();
  for (const sid of studentIds) attMap.set(sid, { total: 0, present: 0 });
  for (const r of attRecords) {
    const s = attMap.get(r.studentProfileId)!;
    s.total++;
    if (r.status === 'PRESENT') s.present++;
  }
  for (const [sid, stats] of attMap.entries()) {
    const pct = stats.total === 0 ? 0 : (stats.present / stats.total) * 100;
    await prisma.leaderboardAttendance.upsert({
      where: { studentProfileId_periodType_periodStart: { studentProfileId: sid, periodType: 'MONTHLY', periodStart } },
      create: { studentProfileId: sid, periodType: 'MONTHLY', periodStart, totalClasses: stats.total, classesAttended: stats.present, attendancePercent: pct },
      update: { totalClasses: stats.total, classesAttended: stats.present, attendancePercent: pct },
    });
  }
  console.log(`           Synced ${attMap.size} students.\n`);

  // ── Step 3: Sync Assignment Scores ──────────────────────────────────────
  console.log(`[STEP 3] Syncing assignment scores...`);
  const batchAssignments = await prisma.batchAssignment.findMany({
    where: { assignedAt: { gte: periodStart, lte: periodEnd } }, select: { id: true },
  });
  const batchIds = batchAssignments.map(b => b.id);
  const studentAssignments = await prisma.studentAssignment.findMany({
    where: { studentProfileId: { in: studentIds }, batchAssignmentId: { in: batchIds } },
    select: { studentProfileId: true, status: true },
  });
  const asgMap = new Map<string, { total: number; completed: number }>();
  for (const sid of studentIds) asgMap.set(sid, { total: 0, completed: 0 });
  for (const sa of studentAssignments) {
    const s = asgMap.get(sa.studentProfileId)!;
    s.total++;
    if (sa.status === 'COMPLETED') s.completed++;
  }
  for (const [sid, stats] of asgMap.entries()) {
    const pct = stats.total === 0 ? 0 : (stats.completed / stats.total) * 100;
    const score = pct === 100 ? 100 : pct >= 40 ? 50 : 0;
    await prisma.assignmentScore.upsert({
      where: { studentProfileId_periodType_periodStart: { studentProfileId: sid, periodType: 'MONTHLY', periodStart } },
      create: { studentProfileId: sid, periodType: 'MONTHLY', periodStart, totalAssignments: stats.total, completedCount: stats.completed, score },
      update: { totalAssignments: stats.total, completedCount: stats.completed, score },
    });
  }
  console.log(`           Synced ${asgMap.size} students.\n`);

  // ── Step 4: Fetch LIVE Lichess Activity & compute fresh streaks ──────────
  console.log(`[STEP 4] Fetching live Lichess activity to compute fresh streaks...`);
  
  // activitySince = 35 days back for streak lookback
  const activitySinceMs = Date.now() - (35 * 86_400_000);
  const periodStartMs = periodStart.getTime();
  const periodEndMs   = periodEnd.getTime();
  
  const liStreakMap     = new Map<string, number>();
  const liActiveDatesMap = new Map<string, string[]>(); // IST date strings

  for (const st of allStudents) {
    if (!st.chessAccount?.lichessUsername) continue;
    try {
      const entries = await fetchLichessActivity(st.chessAccount.lichessUsername);
      const activeDates: string[] = [];
      for (const entry of entries) {
        const ts = entry.interval?.start;
        if (!ts || ts < activitySinceMs || ts > periodEndMs) continue;
        const dateStr = epochToISTDateStr(ts);
        if (entry.games || entry.puzzles || entry.storm || entry.practice) {
          activeDates.push(dateStr);
        }
      }
      const uniqueDates = [...new Set(activeDates)].sort();
      liActiveDatesMap.set(st.id, uniqueDates);
      const { streakDays } = calcStreak(uniqueDates);
      liStreakMap.set(st.id, streakDays);
    } catch {
      liStreakMap.set(st.id, 0);
    }
  }

  // Chess.com streak: use stored ccStreak from StudentChessStats (computed from all archives)
  const chessStats = await prisma.studentChessStats.findMany({
    where: { studentProfileId: { in: studentIds } },
    select: { studentProfileId: true, ccStreak: true, ccTotalRapid: true, ccTotalBlitz: true, lastSyncedAt: true },
  });
  const chessStatsMap = new Map(chessStats.map(s => [s.studentProfileId, s]));

  console.log(`           Done.\n`);

  // ── Step 5: Read all DB scores ───────────────────────────────────────────
  console.log(`[STEP 5] Reading all scores from database...`);
  const snapshots = await prisma.chessActivitySnapshot.findMany({
    where: { periodType: 'MONTHLY', periodStart, studentProfileId: { in: studentIds } },
  });
  const snapshotMap = new Map(snapshots.map(s => [s.studentProfileId, s]));

  const feedbacks = await prisma.coachFeedback.findMany({
    where: { periodType: 'MONTHLY', periodStart, studentProfileId: { in: studentIds } },
  });
  const feedbackMap = new Map(feedbacks.map(f => [f.studentProfileId, f]));

  const attendances = await prisma.leaderboardAttendance.findMany({
    where: { periodType: 'MONTHLY', periodStart, studentProfileId: { in: studentIds } },
  });
  const attendanceMap = new Map(attendances.map(a => [a.studentProfileId, a]));

  const asgScores = await prisma.assignmentScore.findMany({
    where: { periodType: 'MONTHLY', periodStart, studentProfileId: { in: studentIds } },
  });
  const asgScoreMap = new Map(asgScores.map(a => [a.studentProfileId, a]));

  const trnScores = await prisma.tournamentScore.findMany({
    where: { periodType: 'MONTHLY', periodStart, studentProfileId: { in: studentIds } },
  });
  const trnMap = new Map<string, number>();
  for (const t of trnScores) {
    trnMap.set(t.studentProfileId, Math.min((trnMap.get(t.studentProfileId) ?? 0) + t.score, 100));
  }
  console.log(`           Done.\n`);

  // ── Step 6: Compute per-student totals ──────────────────────────────────
  type Row = {
    name: string; email: string; cc: string | null; li: string | null;
    totalScore: number; hasSnapshot: boolean;
    scores: ReturnType<typeof calcScores> | null;
    coachFeedback: number;
    attendancePct: number; attendancePoints: number; attTotal: number; attPresent: number;
    asgTotal: number; asgCompleted: number; asgScore: number;
    trnScore: number;
    liActiveDates: string[];
    ccStreakRaw: number;
    liStreakRaw: number;
    snapshotFetchedAt: Date | null;
  };

  const rows: Row[] = [];

  for (const st of allStudents) {
    const sid = st.id;
    const snap = snapshotMap.get(sid) ?? null;
    const fb = feedbackMap.get(sid);
    const att = attendanceMap.get(sid);
    const asg = asgScoreMap.get(sid);

    const coachFeedback = fb
      ? Math.min(fb.engagement + fb.behaviour + fb.conceptAdoption + fb.joiningOnTime + fb.cameraOn, 50) : 0;
    const attendancePct = att?.attendancePercent ?? 0;
    const attendancePoints = attendancePct >= 75 ? 50 : 0;
    const asgScore = asg?.score ?? 0;
    const trnScore = trnMap.get(sid) ?? 0;

    // Streak: max of live Lichess streak and stored CC streak
    const ccStats = chessStatsMap.get(sid);
    const ccStreakRaw = ccStats?.ccStreak ?? 0;
    const liStreakRaw = liStreakMap.get(sid) ?? 0;
    const combinedStreak = Math.max(ccStreakRaw, liStreakRaw);

    const scores = snap ? calcScores(snap, combinedStreak) : null;

    const chessTotal = scores
      ? scores.rapidClassicalPoints + scores.blitzPoints + scores.puzzlePoints +
        scores.winRateBonus + scores.puzzleAccBonus + scores.ratingBonus +
        scores.streakBonus + scores.bulletPenalty
      : 0;

    const totalScore = Math.max(0, Math.min(
      chessTotal + coachFeedback + attendancePoints + asgScore + trnScore, 1000));

    rows.push({
      name: st.user.name, email: st.user.email ?? '',
      cc: st.chessAccount?.chessComUsername ?? null,
      li: st.chessAccount?.lichessUsername ?? null,
      totalScore, hasSnapshot: !!snap, scores,
      coachFeedback, attendancePct, attendancePoints,
      attTotal: att?.totalClasses ?? 0, attPresent: att?.classesAttended ?? 0,
      asgTotal: asg?.totalAssignments ?? 0, asgCompleted: asg?.completedCount ?? 0, asgScore,
      trnScore,
      liActiveDates: liActiveDatesMap.get(sid) ?? [],
      ccStreakRaw, liStreakRaw,
      snapshotFetchedAt: snap?.fetchedAt ?? null,
    });
  }

  rows.sort((a, b) => b.totalScore - a.totalScore);

  // ── Step 7: Print Summary Table ──────────────────────────────────────────
  console.log(`${line}`);
  console.log(` RANKED SUMMARY  (${rows.length} students)   Today IST: ${todayIST}`);
  console.log(thin);
  console.log(`RNK  ${'NAME'.padEnd(26)} ${'SCORE'.padStart(5)}  ${'CC USER'.padEnd(16)} CC?  ATT%        ASG         STREAK`);
  console.log(thin);

  let rank = 1;
  for (const r of rows) {
    const snapFlag = r.hasSnapshot ? '✓' : '✗';
    const attStr = `${r.attendancePct.toFixed(0)}%(${r.attPresent}/${r.attTotal})`.padEnd(11);
    const asgStr = `${r.asgCompleted}/${r.asgTotal}=${r.asgScore}`.padEnd(11);
    const streak = Math.max(r.ccStreakRaw, r.liStreakRaw);
    console.log(
      `${String(rank).padStart(3)}.  ${r.name.slice(0, 25).padEnd(26)} ${String(r.totalScore).padStart(5)}  ` +
      `${(r.cc ?? 'N/A').slice(0, 15).padEnd(16)} ${snapFlag}    ${attStr}${asgStr}${streak}d`
    );
    rank++;
  }

  // ── Step 8: Detailed Breakdown ───────────────────────────────────────────
  console.log(`\n${line}`);
  console.log(` DETAILED BREAKDOWN — STUDENT BY STUDENT`);
  console.log(`${line}\n`);

  rank = 1;
  for (const r of rows) {
    const s = r.scores;
    const combinedStreak = Math.max(r.ccStreakRaw, r.liStreakRaw);

    console.log(`┌─ RANK ${rank}  ·  ${r.name}`);
    console.log(`│  Email     : ${r.email}`);
    console.log(`│  Chess.com : ${r.cc ?? 'N/A'}  |  Lichess : ${r.li ?? 'N/A'}`);
    if (r.snapshotFetchedAt) {
      const fetchedIST = epochToISTDateStr(r.snapshotFetchedAt.getTime());
      console.log(`│  Snapshot fetched on : ${fetchedIST} (IST)  — today is ${todayIST}`);
    }

    if (!r.hasSnapshot) {
      console.log(`│  ⚠ NO CHESS SNAPSHOT — chess scores are 0 (account not linked or not fetched)`);
    } else if (s) {
      console.log(`│`);
      console.log(`│  ── CHESS SCORES ──`);
      console.log(`│  A  Rapid+Classical : ${s.rapidClassicalGames} games × 2 = ${s.rapidClassicalPoints} pts (cap 174)`);
      console.log(`│     Blitz           : ${s.blitzGames} games × 1 = ${s.blitzPoints} pts (cap 51)`);
      console.log(`│`);
      console.log(`│  B  Puzzles (Lichess only — CC has no per-period puzzle API)`);
      console.log(`│     Solved          : ${s.puzzleSolved}`);
      console.log(`│     Formula         : ${s.puzzleSolved} × 0.5 = ${s.puzzlePoints} pts (cap 225)`);
      console.log(`│`);
      console.log(`│  C  Win Rate Bonus`);
      console.log(`│     Games (R+B)     : ${s.totalGames}   Wins: ${s.totalWins}   Rate: ${s.winRate.toFixed(1)}%`);
      console.log(`│     Rule            : need ≥10 games. ≥50% → +75  <50% → −50`);
      console.log(`│     Points          : ${s.winRateBonus >= 0 ? '+' : ''}${s.winRateBonus} pts`);
      console.log(`│`);
      console.log(`│  D  Puzzle Accuracy Bonus`);
      console.log(`│     Attempts        : ${s.puzzleAttempts}   Success: ${s.puzzleSuccessRate.toFixed(1)}%`);
      console.log(`│     Rule            : need ≥20 attempts. ≥70% → +50  <70% → −25`);
      console.log(`│     Points          : ${s.puzzleAccBonus >= 0 ? '+' : ''}${s.puzzleAccBonus} pts`);
      console.log(`│`);
      console.log(`│  E  Rating Improvement Bonus`);
      console.log(`│     Start → End     : ${s.rapidRatingStart} → ${s.rapidRatingEnd} (${s.ratingDiff >= 0 ? '+' : ''}${s.ratingDiff})`);
      console.log(`│     Rule            : +25 per +50 rating, max 100`);
      console.log(`│     Points          : +${s.ratingBonus} pts`);
      console.log(`│`);
      console.log(`│  F  Consistency Streak`);
      // Show detailed streak breakdown
      const ccS = r.ccStreakRaw;
      const liS = r.liStreakRaw;
      const liDates = r.liActiveDates.slice().sort().reverse().slice(0, 10); // last 10 active days
      console.log(`│     Chess.com streak : ${ccS} days (from StudentChessStats)`);
      console.log(`│     Lichess streak   : ${liS} days (LIVE from API)`);
      if (liDates.length > 0) {
        console.log(`│     Lichess active   : ${liDates.join(', ')}${r.liActiveDates.length > 10 ? ' ...' : ''}`);
      }
      console.log(`│     Combined (max)   : ${combinedStreak} days`);
      console.log(`│     Rule             : 7d=5, 14d=10, 21d=15, 30d=25`);
      console.log(`│     Points           : +${s.streakBonus} pts`);
      if (s.bulletPenalty < 0) {
        console.log(`│  ⚠ BULLET PENALTY  : ${s.bulletTotal} bullet games → ${s.bulletPenalty} pts`);
      }
    }

    console.log(`│`);
    console.log(`│  ── MANUAL SCORES ──`);
    console.log(`│  Coach Feedback  : ${r.coachFeedback} / 50`);
    console.log(`│  Attendance      : ${r.attPresent}/${r.attTotal} classes = ${r.attendancePct.toFixed(1)}% → ${r.attendancePoints} / 50`);
    console.log(`│  Assignments     : ${r.asgCompleted}/${r.asgTotal} done → ${r.asgScore} / 100`);
    console.log(`│  Tournament      : ${r.trnScore} / 100`);
    console.log(`│`);
    console.log(`└─ FINAL SCORE : ${r.totalScore} / 1000`);
    console.log();
    rank++;
  }

  console.log(`${line}`);
  console.log(` Report complete. Generated at ${new Date().toLocaleString('en-IN')}  (IST today: ${todayIST})`);
  console.log(`${line}\n`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
