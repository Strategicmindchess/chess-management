import { prisma } from '../src/lib/prisma';
import { SYLLABUS_MAP } from '../src/lib/syllabus';
import { generateInstancesInternal } from '../src/lib/instance-generator';

async function fixBatch() {
  const batchCode = 'IND-AC3-254';
  const batch = await prisma.batch.findUnique({ where: { code: batchCode } });
  
  if (!batch) return console.error('Batch not found');
  
  // Delete all SCHEDULED classes on or after Aug 28
  const cutoffDate = new Date('2026-08-28T00:00:00.000Z');
  const deleted = await prisma.classInstance.deleteMany({
    where: {
      batchId: batch.id,
      status: 'SCHEDULED',
      date: { gte: cutoffDate }
    }
  });
  console.log(`Deleted ${deleted.count} future SCHEDULED instances.`);
  
  const syllabus = SYLLABUS_MAP[batch.level as any];
  const startSession = 8;
  const instancesToGenerate = syllabus.lectures - startSession + 1;
  
  if (instancesToGenerate > 0) {
    console.log(`Generating ${instancesToGenerate} new instances starting from session ${startSession}...`);
    // We pass undefined as customStartDate so the system automatically looks at the batch's schedule 
    // and finds the exact next valid date (which will be Monday, Aug 31).
    await generateInstancesInternal(batch.id, instancesToGenerate, undefined, startSession);
    console.log('Successfully generated clean schedule.');
  }
}

fixBatch().catch(console.error);
