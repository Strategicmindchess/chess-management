import { prisma } from '../src/lib/prisma';
import { getCurrentPeriod } from '../src/lib/leaderboard-period';

async function main() {
  const username = 'Nikhilesh39';
  const period = getCurrentPeriod('MONTHLY');

  console.log(`=============================================================`);
  console.log(` LEADERBOARD SCORE REPORT FOR ${username}`);
  console.log(` Period: ${period.periodStart.toISOString()} to ${period.periodEnd.toISOString()}`);
  console.log(`=============================================================\n`);

  // Find Student
  const studentProfile = await prisma.studentProfile.findFirst({
    where: {
      chessAccount: {
        chessComUsername: { equals: username, mode: 'insensitive' }
      }
    },
    include: { user: true }
  });

  if (!studentProfile) {
    console.log(`Student with Chess.com username ${username} not found!`);
    return;
  }
  const sid = studentProfile.id;

  // 1. Snapshot Data (Games, Puzzles, Streaks)
  const snapshot = await prisma.chessActivitySnapshot.findFirst({
    where: { studentProfileId: sid, periodType: 'MONTHLY', periodStart: period.periodStart },
  });

  if (!snapshot) {
    console.log(`No ChessActivitySnapshot found for this period.`);
    return;
  }

  // 2. Manual Data (Feedback, Attendance, etc.)
  const feedback = await prisma.coachFeedback.findFirst({
    where: { studentProfileId: sid, periodType: 'MONTHLY', periodStart: period.periodStart },
  });
  
  const attendance = await prisma.leaderboardAttendance.findUnique({
    where: { studentProfileId_periodType_periodStart: { studentProfileId: sid, periodType: 'MONTHLY', periodStart: period.periodStart } },
  });

  const assignments = await prisma.assignmentScore.findMany({
    where: { studentProfileId: sid, periodType: 'MONTHLY', periodStart: period.periodStart },
  });
  const assignmentScore = Math.min(assignments.reduce((sum, a) => sum + a.score, 0), 100);

  const tournaments = await prisma.tournamentScore.findMany({
    where: { studentProfileId: sid, periodType: 'MONTHLY', periodStart: period.periodStart },
  });
  const tournamentScore = Math.min(tournaments.reduce((sum, t) => sum + t.score, 0), 100);

  let totalScore = 0;
  console.log(`--- A. GAMES PLAYED ---`);
  
  // Rapid + Classical: 2 pts per game, max 87 games, max 174 pts
  const rapidClassicalGames = snapshot.rapidGames + snapshot.classicalGames;
  const rapidClassicalPoints = Math.min(rapidClassicalGames * 2, 174);
  console.log(`Rapid+Classical Games : ${rapidClassicalGames}`);
  console.log(`Formula               : min(Games * 2, 174)`);
  console.log(`Points Awarded        : ${rapidClassicalPoints}\n`);
  totalScore += rapidClassicalPoints;

  // Blitz: 1 pt per game, max 51 games, max 51 pts
  const blitzPoints = Math.min(snapshot.blitzGames * 1, 51);
  console.log(`Blitz Games           : ${snapshot.blitzGames}`);
  console.log(`Formula               : min(Games * 1, 51)`);
  console.log(`Points Awarded        : ${blitzPoints}\n`);
  totalScore += blitzPoints;

  console.log(`--- B. PUZZLE SOLVING ---`);
  // Puzzle: 0.5 pt per puzzle solved, max 450 puzzles, max 225 pts
  const puzzlePoints = Math.min(snapshot.puzzleSolved * 0.5, 225);
  console.log(`Puzzles Solved        : ${snapshot.puzzleSolved}`);
  console.log(`Formula               : min(Solved * 0.5, 225)`);
  console.log(`Points Awarded        : ${puzzlePoints}\n`);
  totalScore += puzzlePoints;

  console.log(`--- C. GAME WIN RATE BONUS ---`);
  // Win Rate (Rapid+Blitz combined) > 50% -> +75, < 50% -> -50
  const totalGames = snapshot.rapidGames + snapshot.blitzGames;
  const totalWins = snapshot.rapidWins + snapshot.blitzWins;
  const winRate = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;
  let winRateBonus = 0;
  if (totalGames >= 10) {
    winRateBonus = winRate >= 50 ? 75 : -50;
  }
  console.log(`Total Games (R+B)     : ${totalGames}`);
  console.log(`Total Wins            : ${totalWins}`);
  console.log(`Win Rate              : ${winRate.toFixed(1)}%`);
  console.log(`Rule                  : Must have >=10 games. >=50% = +75, <50% = -50`);
  console.log(`Points Awarded        : ${winRateBonus}\n`);
  totalScore += winRateBonus;

  console.log(`--- D. PUZZLE ACCURACY BONUS ---`);
  // Success Rate > 70% -> +50, < 70% -> -25
  const puzzleSuccessRate = snapshot.puzzleAttempts > 0 ? (snapshot.puzzleSolved / snapshot.puzzleAttempts) * 100 : 0;
  let puzzleAccBonus = 0;
  if (snapshot.puzzleAttempts >= 20) {
    puzzleAccBonus = puzzleSuccessRate >= 70 ? 50 : -25;
  }
  console.log(`Puzzle Attempts       : ${snapshot.puzzleAttempts}`);
  console.log(`Success Rate          : ${puzzleSuccessRate.toFixed(1)}%`);
  console.log(`Rule                  : Must have >=20 attempts. >=70% = +50, <70% = -25`);
  console.log(`Points Awarded        : ${puzzleAccBonus}\n`);
  totalScore += puzzleAccBonus;

  console.log(`--- E. RATING IMPROVEMENT BONUS ---`);
  // +25 pts per +50 rating gained, max 100 pts.
  const rapidStart = snapshot.rapidRatingStart || 0;
  const rapidEnd = snapshot.rapidRatingEnd || 0;
  const diff = rapidEnd - rapidStart;
  let ratingBonus = 0;
  if (diff >= 50) ratingBonus = 25;
  if (diff >= 100) ratingBonus = 50;
  if (diff >= 150) ratingBonus = 75;
  if (diff >= 200) ratingBonus = 100;
  console.log(`Start Rating          : ${rapidStart}`);
  console.log(`End Rating            : ${rapidEnd}`);
  console.log(`Difference            : ${diff > 0 ? '+' : ''}${diff}`);
  console.log(`Rule                  : +25 for every +50 rating gained. Max 100`);
  console.log(`Points Awarded        : ${ratingBonus}\n`);
  totalScore += ratingBonus;

  console.log(`--- F. CONSISTENCY STREAK BONUS ---`);
  // Streak
  let streakBonus = 0;
  if (snapshot.streakDays >= 30) streakBonus = 25;
  else if (snapshot.streakDays >= 21) streakBonus = 15;
  else if (snapshot.streakDays >= 14) streakBonus = 10;
  else if (snapshot.streakDays >= 7) streakBonus = 5;
  console.log(`Streak Days           : ${snapshot.streakDays}`);
  console.log(`Rule                  : 30d=25, 21d=15, 14d=10, 7d=5`);
  console.log(`Points Awarded        : ${streakBonus}\n`);
  totalScore += streakBonus;

  console.log(`--- MANUAL SCORES ---`);
  
  // Coach Feedback
  const cf = feedback ? Math.min(feedback.engagement + feedback.behaviour + feedback.conceptAdoption + feedback.joiningOnTime + feedback.cameraOn, 50) : 0;
  console.log(`Coach Feedback        : ${cf} / 50`);
  totalScore += cf;
  
  // Attendance
  const att = (attendance && attendance.attendancePercent >= 75) ? 50 : 0;
  console.log(`Attendance            : ${attendance?.attendancePercent?.toFixed(1) || 0}% -> ${att} / 50`);
  totalScore += att;
  
  // Assignment
  console.log(`Assignment            : ${assignmentScore} / 100`);
  totalScore += assignmentScore;

  // Tournament
  console.log(`Tournament            : ${tournamentScore} / 100\n`);
  totalScore += tournamentScore;

  console.log(`--- PENALTIES ---`);
  let bulletPenalty = 0;
  const bulletTotal = snapshot.bulletGames + snapshot.ultraBulletGames;
  if (bulletTotal > 50) bulletPenalty = -200;
  console.log(`Bullet/Ultra Games    : ${bulletTotal}`);
  console.log(`Rule                  : > 50 games = -200 penalty`);
  console.log(`Points Deducted       : ${bulletPenalty}\n`);
  totalScore += bulletPenalty;

  totalScore = Math.max(0, Math.min(totalScore, 1000));
  console.log(`=============================================================`);
  console.log(` FINAL CALCULATED SCORE : ${totalScore} / 1000`);
  console.log(`=============================================================`);

}

main().catch(console.error).finally(() => prisma.$disconnect());
