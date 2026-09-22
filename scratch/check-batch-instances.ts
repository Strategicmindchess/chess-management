import { prisma } from '../src/lib/prisma';

async function main() {
  const batch = await prisma.batch.findFirst({
    where: { name: { contains: 'Advance Batch- IND-AA2-26' } },
    include: {
      classInstances: {
        orderBy: { date: 'asc' }
      }
    }
  });

  if (!batch) {
    console.log("Batch not found!");
    return;
  }

  console.log(`Found Batch: ${batch.name} (ID: ${batch.id}), startSession: ${batch.startSession}`);
  console.log(`Total Instances: ${batch.classInstances.length}`);

  batch.classInstances.forEach((inst, index) => {
    console.log(`[${index + 1}] Date: ${inst.date.toISOString()} | Start: ${inst.startTime} | Session: ${inst.sessionNumber} | LectureName: ${inst.lectureName}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
