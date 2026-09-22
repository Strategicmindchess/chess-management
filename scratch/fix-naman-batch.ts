import { prisma } from '../src/lib/prisma';
import { generateInstancesInternal } from '../src/lib/instance-generator';

async function main() {
  const batchId = 'cms7ig3mn001r04l7pk3w2yxo';
  
  // 1. Ensure Batch startSession is 11
  await prisma.batch.update({
    where: { id: batchId },
    data: { startSession: 11 }
  });

  console.log("Updated Batch startSession to 11.");

  // 2. Fetch syllabus map for ADVANCE_2
  const resources = await prisma.resource.findMany({ where: { level: 'ADVANCE_2' } });
  const topicsMap = new Map<number, string>();
  resources.forEach(r => {
    if (r.lectureNumber) topicsMap.set(r.lectureNumber, r.title);
  });

  // 3. Generate additional instances to make sure we reach 48 lectures
  // We need to cover from Lecture 11 to 48, which is 38 lectures.
  // There are already some instances, let's just forcefully generate 40 more to be safe.
  console.log("Generating 40 more instances to ensure we cover all lectures...");
  await generateInstancesInternal(batchId, 40); // there is already 20 instances 

  // 4. Fetch all instances ordered by date
  let instances = await prisma.classInstance.findMany({
    where: { batchId },
    orderBy: { date: 'asc' }
  });

  console.log(`Total instances after generation: ${instances.length}`);

  // 5. Update session numbers and lecture names starting from the Sep 20 class
  // The Sep 20 class (Sun) in UTC is represented as >= 2026-09-19T18:00:00.000Z
  const targetDate = new Date('2026-09-19T18:00:00.000Z');
  
  let currentSession = 11;
  let updatedCount = 0;

  for (const inst of instances) {
    if (inst.date >= targetDate) {
      if (currentSession > 48) {
        // If we've reached past lecture 48, we can optionally delete the extra instances
        // since the syllabus ends at 48. Let's just delete them to keep it clean.
        console.log(`Deleting extra instance on ${inst.date.toISOString()} (beyond Lecture 48)`);
        await prisma.classInstance.delete({ where: { id: inst.id } });
        continue;
      }

      const lectureName = topicsMap.get(currentSession) || null;
      await prisma.classInstance.update({
        where: { id: inst.id },
        data: {
          sessionNumber: currentSession,
          lectureName: lectureName
        }
      });
      console.log(`Updated Instance ${inst.date.toISOString()} -> Session ${currentSession} | ${lectureName}`);
      currentSession++;
      updatedCount++;
    }
  }

  console.log(`Successfully linked ${updatedCount} instances with syllabus names and session numbers!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
