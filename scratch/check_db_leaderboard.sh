#!/bin/sh
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Latest calculation logs
  const calcLogs = await prisma.leaderboardCalculationLog.findMany({
    orderBy: { startedAt: 'desc' },
    take: 5,
  });
  console.log('=== Latest Calculation Logs ===');
  calcLogs.forEach(l => {
    console.log('  [' + l.periodType + '] ' + l.status + ' | started: ' + l.startedAt.toISOString() + ' | students: ' + (l.studentsProcessed || 0));
  });

  // Latest LeaderboardEntry records
  const entries = await prisma.leaderboardEntry.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 10,
    include: { studentProfile: { include: { user: { select: { name: true } } } } },
  });
  console.log('=== Latest LeaderboardEntry ===');
  entries.forEach(e => {
    console.log('  ' + e.studentProfile.user.name + ': score=' + e.totalScore + ' | updated=' + e.updatedAt.toISOString().slice(0,19));
  });

  // Latest ChessDataSnapshot
  const snaps = await prisma.chessDataSnapshot.findMany({
    orderBy: { fetchedAt: 'desc' },
    take: 5,
    include: { studentProfile: { include: { user: { select: { name: true } } } } },
  });
  console.log('=== Latest Chess Snapshots ===');
  snaps.forEach(s => {
    console.log('  ' + s.studentProfile.user.name + ': ' + s.platform + ' fetched=' + s.fetchedAt.toISOString().slice(0,19));
  });
}

main().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); }).finally(() => prisma.\$disconnect());
"
