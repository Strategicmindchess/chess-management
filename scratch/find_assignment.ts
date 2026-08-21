import { prisma } from '../src/lib/prisma';

async function main() {
  const batch = await prisma.batch.findFirst({
    where: { name: { contains: 'Rucha Ji 1-1', mode: 'insensitive' } }
  });

  if (!batch) {
    console.log("Batch not found");
    return;
  }

  console.log(`Batch: ${batch.name} (Level: ${batch.level})`);

  const assignments = await prisma.batchAssignment.findMany({
    where: { batchId: batch.id },
    include: { resource: true }
  });

  for (const a of assignments) {
    console.log(`Assignment for L${a.lectureNumber}:`);
    console.log(`  Resource ID: ${a.resource.id}`);
    console.log(`  Resource Title: ${a.resource.title}`);
    console.log(`  Resource URL: ${a.resource.url}`);
    console.log(`  Resource Level: ${a.resource.level}`);
    console.log(`  Resource Source: ${a.resource.source}`);
    console.log(`  Resource Type: ${a.resource.type}`);
    console.log(`  Resource Created At: ${a.resource.createdAt}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
