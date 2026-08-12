import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

async function main() {
  const { prisma } = await import('./src/lib/prisma');
  
  const startDate = new Date('2026-08-10T00:00:00.000Z');
  const endDate = new Date('2026-08-12T23:59:59.999Z');

  // Find class instances for Core 3 and Core 4 on Aug 10, 11, 12 that have been logged
  const classInstances = await prisma.classInstance.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
      status: 'COMPLETED',
      classLogId: { not: null },
      batch: {
        level: {
          in: ['CORE_3', 'CORE_4']
        }
      }
    },
    include: {
      batch: { select: { id: true, name: true, level: true } }
    }
  });

  console.log(`Found ${classInstances.length} completed Core 3/4 classes between Aug 10-12 with class logs.`);

  for (const ci of classInstances) {
    if (!ci.sessionNumber || !ci.batch.level) continue;

    console.log(`\nProcessing Batch: ${ci.batch.name}, Level: ${ci.batch.level}, Session: ${ci.sessionNumber}`);

    // Get resources for this session
    const resources = await prisma.resource.findMany({
      where: {
        level: ci.batch.level as any,
        lectureNumber: ci.sessionNumber,
      },
    });

    if (resources.length === 0) {
      console.log(`  -> No resources found in DB for this level/session.`);
      continue;
    }

    // Get enrolled students
    const enrolledStudents = await prisma.batchStudent.findMany({
      where: { batchId: ci.batch.id },
    });

    console.log(`  -> Found ${resources.length} resources and ${enrolledStudents.length} enrolled students.`);

    for (const resource of resources) {
      let batchAssignmentId = "";
      
      // Upsert BatchAssignment
      const existingBa = await prisma.batchAssignment.findUnique({
        where: {
          batchId_resourceId: {
            batchId: ci.batch.id,
            resourceId: resource.id,
          }
        }
      });

      if (existingBa) {
        batchAssignmentId = existingBa.id;
        console.log(`  -> BatchAssignment already exists for resource ${resource.id} (ID: ${batchAssignmentId})`);
      } else {
        const batchAssignment = await prisma.batchAssignment.create({
          data: {
            batchId: ci.batch.id,
            resourceId: resource.id,
            lectureNumber: ci.sessionNumber,
            releasedAt: ci.date,
          },
        });
        batchAssignmentId = batchAssignment.id;
        console.log(`  -> Created BatchAssignment ID: ${batchAssignmentId}`);
      }

      // Create StudentAssignments
      if (batchAssignmentId && enrolledStudents.length > 0) {
        const created = await prisma.studentAssignment.createMany({
          data: enrolledStudents.map((s) => ({
            batchAssignmentId: batchAssignmentId,
            studentProfileId: s.studentProfileId,
          })),
          skipDuplicates: true,
        });
        console.log(`  -> Created ${created.count} StudentAssignments.`);
      }
    }
  }
}

main().catch(console.error).finally(async () => {
  const { prisma } = await import('./src/lib/prisma');
  await prisma.$disconnect();
});
