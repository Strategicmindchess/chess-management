import { triggerLeaderboardCalc } from './src/actions/leaderboard/fetch-actions';
import { prisma } from './src/lib/prisma';

async function main() {
  console.log("Triggering leaderboard calculation...");
  await triggerLeaderboardCalc('MONTHLY');
  console.log("Triggered. Wait a few seconds for the worker to process it.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
