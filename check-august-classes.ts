import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

async function main() {
  const { prisma } = await import('./src/lib/prisma');
  
  const startDate = new Date('2026-08-10T00:00:00.000Z');
  const endDate = new Date('2026-08-11T23:59:59.999Z');

  // Find class instances on Aug 10 and 11
  const classInstances = await prisma.classInstance.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
      status: 'COMPLETED'
    },
    include: {
      batch: { select: { id: true, name: true, level: true } }
    }
  });

  console.log('--- COMPLETED CLASS INSTANCES on AUG 10 & 11 ---');
  for (const ci of classInstances) {
    console.log(`\nClassInstance ID: ${ci.id}\nDate: ${ci.date.toISOString()}\nBatch: ${ci.batch.name}\nLevel: ${ci.batch.level}\nSessionNumber: ${ci.sessionNumber}`);
    
    // Check if class log exists
    console.log(`  -> ClassLog Exists: ${!!ci.classLogId} (ID: ${ci.classLogId})`);

    // Check BatchAssignment for this batch and session
    if (ci.sessionNumber) {
      const batchAssignments = await prisma.batchAssignment.findMany({
        where: {
          batchId: ci.batchId,
          lectureNumber: ci.sessionNumber
        },
        include: {
          studentStatuses: true
        }
      });
      console.log(`  -> BatchAssignments for this session: ${batchAssignments.length}`);
      for (const ba of batchAssignments) {
        console.log(`      - BatchAssignment ID: ${ba.id}, ResourceID: ${ba.resourceId}, StudentAssignments Count: ${ba.studentStatuses.length}`);
      }
      
      // Also check if any resources exist for this level and session
      if (ci.batch.level) {
        const resources = await prisma.resource.findMany({
          where: {
            level: ci.batch.level as any,
            lectureNumber: ci.sessionNumber
          }
        });
        console.log(`  -> Resources available for ${ci.batch.level} session ${ci.sessionNumber}: ${resources.length}`);
      }
    }
  }
}

main().catch(console.error).finally(async () => {
  const { prisma } = await import('./src/lib/prisma');
  await prisma.$disconnect();
});
