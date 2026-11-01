import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import fs from 'fs';
import { prisma } from '../lib/prisma';
import { getCurrentPeriod } from '../lib/leaderboard-period';

async function verifyAll() {
  const { periodStart, periodEnd } = getCurrentPeriod('MONTHLY');
  console.log(`Checking period: MONTHLY (${periodStart.toISOString().split('T')[0]} to ${periodEnd.toISOString().split('T')[0]})\n`);

  // 1. Fetch all active students
  const activeStudents = await prisma.user.findMany({
    where: { role: 'STUDENT', isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      studentProfile: {
        select: {
          id: true,
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  const studentProfiles = activeStudents
    .filter(u => u.studentProfile?.id)
    .map(u => ({
      userId: u.id,
      name: u.name || 'Unnamed',
      email: u.email,
      studentProfileId: u.studentProfile!.id,
    }));

  const studentIds = studentProfiles.map(s => s.studentProfileId);

  // 2. Fetch raw attendance records
  const rawAttendance = await prisma.attendanceRecord.findMany({
    where: {
      studentProfileId: { in: studentIds },
      classLog: {
        date: { gte: periodStart, lte: periodEnd }
      }
    },
    select: {
      studentProfileId: true,
      status: true,
    }
  });

  const attendanceStats = new Map<string, { total: number; present: number }>();
  for (const s of studentProfiles) {
    attendanceStats.set(s.studentProfileId, { total: 0, present: 0 });
  }
  for (const r of rawAttendance) {
    const stat = attendanceStats.get(r.studentProfileId);
    if (stat) {
      stat.total++;
      if (r.status === 'PRESENT') stat.present++;
    }
  }

  // 3. Fetch raw assignments
  const rawAssignments = await prisma.studentAssignment.findMany({
    where: {
      studentProfileId: { in: studentIds },
      batchAssignment: {
        assignedAt: { gte: periodStart, lte: periodEnd }
      }
    },
    select: {
      studentProfileId: true,
      status: true,
      completionLevel: true,
    }
  });

  const assignmentStats = new Map<string, { total: number; completed: number }>();
  for (const s of studentProfiles) {
    assignmentStats.set(s.studentProfileId, { total: 0, completed: 0 });
  }
  for (const a of rawAssignments) {
    const stat = assignmentStats.get(a.studentProfileId);
    if (stat) {
      stat.total++;
      if (a.status === 'COMPLETED' || (a as any).completionLevel === 'FULLY_DONE') {
        stat.completed++;
      }
    }
  }

  // 4. Fetch LeaderboardAttendance table
  const lbAttendanceRows = await prisma.leaderboardAttendance.findMany({
    where: {
      periodType: 'MONTHLY',
      periodStart,
      studentProfileId: { in: studentIds }
    }
  });
  const lbAttMap = new Map(lbAttendanceRows.map(r => [r.studentProfileId, r]));

  // 5. Fetch AssignmentScore table
  const lbAssignmentRows = await prisma.assignmentScore.findMany({
    where: {
      periodType: 'MONTHLY',
      periodStart,
      studentProfileId: { in: studentIds }
    }
  });
  const lbAssignMap = new Map(lbAssignmentRows.map(r => [r.studentProfileId, r]));

  // 6. Fetch LeaderboardEntry table
  const lbEntries = await prisma.leaderboardEntry.findMany({
    where: {
      periodType: 'MONTHLY',
      periodStart,
      studentProfileId: { in: studentIds }
    }
  });
  const lbEntryMap = new Map(lbEntries.map(e => [e.studentProfileId, e]));

  // 7. Comparison Table
  console.log('='.repeat(125));
  console.log(
    'Student Name'.padEnd(24) +
    'Att(P/Tot)'.padEnd(12) +
    'Att%'.padEnd(8) +
    'AttExp'.padEnd(8) +
    'AttLB'.padEnd(8) +
    'Asg(C/Tot)'.padEnd(12) +
    'AsgExp'.padEnd(8) +
    'AsgLB'.padEnd(8) +
    'AttMatch'.padEnd(12) +
    'AsgMatch'.padEnd(12) +
    'TotalPts'
  );
  console.log('='.repeat(125));

  let attMatchCount = 0;
  let assignMatchCount = 0;
  const results = [];

  for (const s of studentProfiles) {
    const att = attendanceStats.get(s.studentProfileId)!;
    const attPct = att.total > 0 ? (att.present / att.total) * 100 : 0;
    const expectedAttPts = attPct >= 75 && att.total > 0 ? 50 : 0;
    const actualLbAttPts = lbEntryMap.get(s.studentProfileId)?.attendance ?? 0;
    const attMatches = expectedAttPts === actualLbAttPts;
    if (attMatches) attMatchCount++;

    const asg = assignmentStats.get(s.studentProfileId)!;
    let expectedAsgPts = 0;
    if (asg.total > 0) {
      const ratio = asg.completed / asg.total;
      if (ratio === 1) expectedAsgPts = 100;
      else if (ratio >= 0.5) expectedAsgPts = 50;
    }
    const actualLbAsgPts = lbEntryMap.get(s.studentProfileId)?.assignment ?? 0;
    const asgMatches = expectedAsgPts === actualLbAsgPts;
    if (asgMatches) assignMatchCount++;

    const entry = lbEntryMap.get(s.studentProfileId);
    results.push({
      name: s.name,
      rawAtt: `${att.present}/${att.total}`,
      attPct: `${attPct.toFixed(1)}%`,
      expectedAttPts,
      actualLbAttPts,
      attMatches,
      rawAsg: `${asg.completed}/${asg.total}`,
      expectedAsgPts,
      actualLbAsgPts,
      asgMatches,
      hasLeaderboardEntry: Boolean(entry),
      totalScore: entry?.totalScore ?? 0,
      rank: entry?.rank ?? '-'
    });

    console.log(
      s.name.slice(0, 23).padEnd(24) +
      `${att.present}/${att.total}`.padEnd(12) +
      `${attPct.toFixed(0)}%`.padEnd(8) +
      `${expectedAttPts}`.padEnd(8) +
      `${actualLbAttPts}`.padEnd(8) +
      `${asg.completed}/${asg.total}`.padEnd(12) +
      `${expectedAsgPts}`.padEnd(8) +
      `${actualLbAsgPts}`.padEnd(8) +
      (attMatches ? '✅ MATCH' : '❌ DIFF').padEnd(12) +
      (asgMatches ? '✅ MATCH' : '❌ DIFF').padEnd(12) +
      `${entry?.totalScore ?? '-'}`
    );
  }

  console.log('='.repeat(125));
  console.log(`\nAUDIT SUMMARY:`);
  console.log(`Total Active Students: ${studentProfiles.length}`);
  console.log(`Attendance Matches: ${attMatchCount} / ${studentProfiles.length} (${((attMatchCount / studentProfiles.length) * 100).toFixed(1)}%)`);
  console.log(`Assignment Matches: ${assignMatchCount} / ${studentProfiles.length} (${((assignMatchCount / studentProfiles.length) * 100).toFixed(1)}%)`);

  fs.writeFileSync(
    'src/scripts/student-audit-report.json',
    JSON.stringify({ periodStart, periodEnd, summary: { total: studentProfiles.length, attMatchCount, assignMatchCount }, results }, null, 2),
    'utf8'
  );
  console.log(`Detailed audit report saved to src/scripts/student-audit-report.json`);
}

verifyAll().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
