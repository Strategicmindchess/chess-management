import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  const batches = await prisma.batch.findMany({
    where: { isActive: true },
    include: {
      coach: { include: { user: { select: { id: true, name: true, email: true } } } },
      _count: { select: { classInstances: true, classLogs: true } }
    }
  });

  console.log(`Found ${batches.length} active batches:`);
  for (const b of batches) {
    console.log(`- Batch ${b.code} (${b.name}): Coach = ${b.coach?.user?.name} (coachProfileId: ${b.coachProfileId}), Instances = ${b._count.classInstances}, Logs = ${b._count.classLogs}`);
  }00

  const reschedules = await prisma.coachRescheduleRequest.findMany({
    where: { status: { in: ['APPROVED', 'APPROVED_WITH_PENALTY'] } },
    include: {
      coach: { include: { user: { select: { name: true } } } },
      replacementCoach: { include: { user: { select: { name: true } } } },
      classInstance: { include: { batch: true } }
    }
  });

  console.log(`\nApproved Reschedule Requests (${reschedules.length}):`);
  for (const r of reschedules) {
    console.log(`- Instance ${r.classInstanceId} (Batch: ${r.classInstance.batch.code}): Original Coach = ${r.coach.user.name}, Replacement Coach = ${r.replacementCoach?.user?.name} (${r.replacementCoachId})`);
  }

  const logs = await prisma.classLog.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      coach: { include: { user: { select: { name: true } } } },
      batch: { select: { code: true, coachProfileId: true } }
    }
  });
  console.log(`\nRecent ClassLogs (${logs.length}):`);
  for (const l of logs) {
    console.log(`- Log ${l.id} (Batch: ${l.batch.code}): Log Coach = ${l.coach.user.name} (ID: ${l.coachProfileId}), Batch Coach ID = ${l.batch.coachProfileId}`);
  }
}

main().finally(() => prisma.$disconnect());
