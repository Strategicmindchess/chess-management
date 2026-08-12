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

    // 3. Calculate how many new instances to generate.
    //    startSession is 1-based (e.g. 4 = "start from Lecture 4").
    //    instancesToGenerate = total lectures - startSession + 1
    //      e.g. 24 lectures, startSession=4 → 24-4+1 = 21 instances (Lectures 4..24)
    const startSession: number = batch.startSession ?? 1;
    let instancesToGenerate = 10; // Fallback for batches without a syllabus

    if (batch.level) {
      const syllabusInfo = SYLLABUS_MAP[batch.level as BatchLevel];
      if (syllabusInfo) {
        instancesToGenerate = syllabusInfo.lectures - startSession + 1;
        if (instancesToGenerate < 0) {
          instancesToGenerate = 0; // startSession is past the end of the syllabus
        }
      }
    }

    if (instancesToGenerate > 0) {
      // Pass startSession directly as the override so generateInstancesInternal
      // uses it without adding any past-instance count on top.
      await generateInstancesInternal(batchId, instancesToGenerate, undefined, startSession);
      console.log(`[BatchProcessor] Generated | ${instancesToGenerate} new instances for batch ${batchId} starting from session ${startSession}.`);
    } else {
      console.log(`[BatchProcessor] Skipped | No instances to generate (startSession ${startSession} is past the end of the syllabus).`);
    }

    console.log(`[BatchProcessor] Completed | JobID: ${job.id}`);
  } catch (error: any) {
    console.error(`[BatchProcessor] Failed | JobID: ${job.id} | Error:`, error);
    throw error;
  }
}
