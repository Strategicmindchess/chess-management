import { prisma } from '../src/lib/prisma';

async function main() {
  const username = 'Nikhilesh39';
  console.log(`Inspecting logs and assignments for ${username} after Aug 12, 2026...\n`);

  const studentProfile = await prisma.studentProfile.findFirst({
    where: {
      chessAccount: { chessComUsername: { equals: username, mode: 'insensitive' } }
    },
    include: { user: true }
  });

  if (!studentProfile) return;
  const sid = studentProfile.id;

  const aug1 = new Date('2026-07-31T18:30:00.000Z');

  // 1. Attendance Records (Class Logs)
  const attendanceRecords = await prisma.attendanceRecord.findMany({
    where: {
      studentProfileId: sid,
      classLog: {
        date: { gte: aug1 }
      }
    },
    include: {
      classLog: {
        include: {
          batch: true
        }
      }
    },
    orderBy: { classLog: { date: 'asc' } }
  });

  console.log(`--- CLASS LOGS AFTER AUG 12 ---`);
  for (const a of attendanceRecords) {
    console.log(`Class Date: ${a.classLog.date.toISOString()} | Batch: ${a.classLog.batch.name} | Topic: ${a.classLog.topicCovered} | Status: ${a.status}`);
  }
  if (attendanceRecords.length === 0) console.log("No class logs found after Aug 12.");

  // 2. Assignments
  const assignments = await prisma.studentAssignment.findMany({
    where: {
      studentProfileId: sid,
      batchAssignment: {
        assignedAt: { gte: aug1 }
      }
    },
    include: {
      batchAssignment: {
        include: {
          batch: true,
          resource: true
        }
      }
    },
    orderBy: { batchAssignment: { assignedAt: 'asc' } }
  });

  console.log(`\n--- ASSIGNMENTS AFTER AUG 12 ---`);
  for (const a of assignments) {
    console.log(`Assigned At: ${a.batchAssignment.assignedAt.toISOString()} | Batch: ${a.batchAssignment.batch.name} | Resource: ${a.batchAssignment.resource.title} | Status: ${a.status} | Completion: ${a.completionLevel}`);
  }
  if (assignments.length === 0) console.log("No assignments found after Aug 12.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
