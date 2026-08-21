import { prisma } from '../src/lib/prisma';

async function compareFloraAndFiona() {
  const entries = await prisma.leaderboardEntry.findMany({
    where: {
      periodType: 'MONTHLY',
      student: {
        user: {
          name: { in: ['Flora Bhatt', 'Fiona Bhatt'] }
        }
      }
    },
    include: {
      student: { include: { user: true } }
    }
  });

  console.log('=== Flora vs Fiona Leaderboard Entries ===');
  for (const e of entries) {
    console.log(`\nStudent: ${e.student.user.name}`);
    console.log(`Rank: #${e.rank}`);
    console.log(`Total Score: ${e.totalScore} pts`);
    console.log(`Rapid+Classical: +${e.rapidClassicalPoints}`);
    console.log(`Blitz: +${e.blitzPoints}`);
    console.log(`Puzzles: +${e.puzzlePoints}`);
    console.log(`Win Rate Bonus: ${e.winRateBonus}`);
    console.log(`Puzzle Accuracy Bonus: ${e.puzzleAccuracyBonus}`);
    console.log(`Coach + Attend + Assign: +${e.coachFeedback + e.attendance + e.assignment}`);
  }
}

compareFloraAndFiona().catch(console.error).finally(() => prisma.$disconnect());
