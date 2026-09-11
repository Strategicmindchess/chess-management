/**
 * One-time backfill: sets overallCoachScore = classQualityScore
 * for all ClassFeedback rows where overallCoachScore is NULL.
 * Run once with: npx tsx scripts/fix-overall-coach-score.ts
 */

import { prisma } from "../src/lib/prisma";

async function main() {
  // Single raw SQL UPDATE — one round-trip, avoids connection timeouts.
  // Table is mapped as "class_feedbacks" (@@map in schema).
  const result = await prisma.$executeRaw`
    UPDATE class_feedbacks
    SET "overallCoachScore" = "classQualityScore"
    WHERE "overallCoachScore" IS NULL
      AND "classQualityScore" IS NOT NULL
  `;

  console.log(`✅ Updated ${result} records (overallCoachScore = classQualityScore).`);
  console.log("Now click 'Recalculate' on the Coach Leaderboard to refresh Perf scores.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
