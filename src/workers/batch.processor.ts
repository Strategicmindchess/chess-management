import { Job } from 'bullmq';
import { prisma } from '../lib/prisma';
import { generateInstancesInternal } from '../lib/instance-generator';
import { SYLLABUS_MAP, BatchLevel } from '../lib/syllabus';

export async function processBatchSync(job: Job) {
  const { batchId } = job.data;
  console.log(`[BatchProcessor] Job Started | JobID: ${job.id} | BatchID: ${batchId}`);

  try {
    // 1. Always fetch latest batch state from the database
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      console.warn(`[BatchProcessor] Batch ${batchId} not found. Skipping.`);
      return;
    }

    // 2. Delete all future SCHEDULED instances.
    //    Past COMPLETED / CANCELLED instances are kept — they are the history.
    const deleted = await prisma.classInstance.deleteMany({
      where: { batchId, status: 'SCHEDULED' },
    });
    console.log(`[BatchProcessor] Deleted | Count: ${deleted.count} old SCHEDULED instances.`);

    // 3. Find the highest sessionNumber among the KEEP (COMPLETED/CANCELLED) instances
    const keptInstances = await prisma.classInstance.findMany({
      where: { batchId, status: { in: ['COMPLETED', 'CANCELLED'] }, sessionNumber: { not: null } },
      orderBy: { sessionNumber: 'desc' },
      take: 1
    });

    let currentSession = batch.startSession ?? 1;
    if (keptInstances.length > 0 && keptInstances[0].sessionNumber) {
      currentSession = keptInstances[0].sessionNumber + 1;
    }

    // 4. Calculate how many new instances to generate.
    let instancesToGenerate = 10; // Fallback for batches without a syllabus
    if (batch.level) {
      const syllabusInfo = SYLLABUS_MAP[batch.level as BatchLevel];
      if (syllabusInfo) {
        instancesToGenerate = syllabusInfo.lectures - currentSession + 1;
        if (instancesToGenerate < 0) {
          instancesToGenerate = 0; // currentSession is past the end of the syllabus
        }
      }
    }

    if (instancesToGenerate > 0) {
      // Pass currentSession directly as the override so generateInstancesInternal
      // uses it without any confusion.
      await generateInstancesInternal(batchId, instancesToGenerate, undefined, currentSession);
      console.log(`[BatchProcessor] Generated | ${instancesToGenerate} new instances for batch ${batchId} starting from session ${currentSession}.`);
    } else {
      console.log(`[BatchProcessor] Skipped | No instances to generate (session ${currentSession} is past the end of the syllabus).`);
    }

    console.log(`[BatchProcessor] Completed | JobID: ${job.id}`);
  } catch (error: any) {
    console.error(`[BatchProcessor] Failed | JobID: ${job.id} | Error:`, error);
    throw error;
  }
}

