import { prisma } from '../src/lib/prisma';

async function main() {
  const batchId = 'cms7ig3mn001r04l7pk3w2yxo';
  
  const assignments = await prisma.batchAssignment.findMany({
    where: { batchId },
    include: { resource: true }
  });

  console.log(`Found ${assignments.length} BatchAssignments for this batch.`);
  if (assignments.length > 0) {
    console.log("First 3 assignments:");
    assignments.slice(0, 3).forEach(a => {
      console.log(`- Lecture ${a.lectureNumber}: ${a.resource.title}`);
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
