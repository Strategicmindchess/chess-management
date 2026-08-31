import { prisma } from '../src/lib/prisma';

async function main() {
  const batch = await prisma.batch.findUnique({
    where: { code: 'IND-AC3-254' },
    include: { schedules: true }
  });
  console.log('Batch:', JSON.stringify(batch, null, 2));
  
  if (!batch) return;
  const instances = await prisma.classInstance.findMany({
    where: { batchId: batch.id },
    orderBy: { date: 'asc' }
  });
  console.log('Instances count:', instances.length);
  instances.forEach(i => console.log(i.date.toISOString().split('T')[0], i.startTime, i.status, i.sessionNumber, i.lectureName));
}

main().catch(console.error);
