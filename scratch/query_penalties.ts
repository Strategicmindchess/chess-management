import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  const targetId = 'cmu9z7ozp000104lbd3vzg2w3';
  console.log(`Fetching details for ID: ${targetId}`);

  // It could be a ClassJoinEvent ID or a ClassLog ID. Let's check both.
  const joinEvent = await prisma.classJoinEvent.findUnique({
    where: { id: targetId },
    include: {
      classInstance: {
        include: {
          batch: true,
          classLog: {
            include: {
              classFeedbacks: true,
              coach: true,
            }
          }
        }
      },
      coachProfile: true,
    }
  });

  if (joinEvent) {
    console.log("Found in ClassJoinEvent:");
    console.dir(joinEvent, { depth: null });
    return;
  }

  const log = await prisma.classLog.findUnique({
    where: { id: targetId },
    include: {
      classInstance: {
        include: { batch: true, joinEvents: true }
      },
      coach: true,
      classFeedbacks: true,
    }
  });

  if (log) {
    console.log("Found in ClassLog:");
    console.dir(log, { depth: null });
    return;
  }

  console.log("Not found in ClassJoinEvent or ClassLog.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
