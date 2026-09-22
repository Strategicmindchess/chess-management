import { prisma } from '../src/lib/prisma';

async function main() {
  const batchId = 'cms7ig3mn001r04l7pk3w2yxo';
  
  const deleted = await prisma.batchAssignment.deleteMany({
    where: { batchId }
  });

  console.log(`Deleted ${deleted.count} early BatchAssignment links to fix the flow.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
