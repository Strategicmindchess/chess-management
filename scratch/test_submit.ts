import { config } from 'dotenv';
config();
import { prisma } from '../src/lib/prisma';
import { submitClassLog } from '../src/actions/class-log-actions';

async function main() {
  // We can't easily mock getCurrentUser inside a server action for this script because it uses next/headers or cookies.
  // Let's just directly execute the logic inside submitClassLog in a script to see if it throws Prisma errors.

  const data = {
    classInstanceId: 'cmsydki3s001k18k2mug0szri',
    topicCovered: 'Lecture 13: Introduction Sicillian Defence',
    durationMins: 60,
    attendance: []
  };

  const coachProfile = await prisma.coachProfile.findUnique({
    where: { id: 'cmrxdegmp000euxuka25tlim0' },
  });

  const classInstance = await prisma.classInstance.findUnique({
    where: { id: data.classInstanceId },
    include: {
      batch: { 
        select: { 
          id: true, 
          level: true,
          coachProfileId: true, 
          payoutRate: true, 
          type: true,
          _count: { select: { classInstances: true } }
        } 
      }
    }
  });

  const batch = classInstance!.batch;

  try {
    await prisma.$transaction(async (tx) => {
      const classLog = await tx.classLog.create({
        data: {
          batchId: batch.id,
          coachProfileId: coachProfile!.id,
          date: classInstance!.date,
          topicCovered: data.topicCovered,
          durationMins: data.durationMins,
          payoutAmount: batch.payoutRate, 
        },
      });

      const completedAt = new Date();
      await tx.classInstance.update({
        where: { id: classInstance!.id },
        data: {
          status: "COMPLETED",
          classLogId: classLog.id,
          completedAt: completedAt,
        }
      });

      if (batch.level && classInstance!.sessionNumber) {
        const resources = await tx.resource.findMany({
          where: {
            level: batch.level as any,
            lectureNumber: classInstance!.sessionNumber,
          },
        });
        
        console.log("Resources found:", resources.length);
        
        if (resources.length > 0) {
          const enrolledStudents = await tx.batchStudent.findMany({
            where: { batchId: batch.id },
          });

          for (const resource of resources) {
            const batchAssignment = await tx.batchAssignment.create({
              data: {
                batchId: batch.id,
                resourceId: resource.id,
                lectureNumber: classInstance!.sessionNumber,
                releasedAt: completedAt,
              },
            });

            if (enrolledStudents.length > 0) {
              await tx.studentAssignment.createMany({
                data: enrolledStudents.map((s) => ({
                  batchAssignmentId: batchAssignment.id,
                  studentProfileId: s.studentProfileId,
                })),
                skipDuplicates: true,
              });
            }
          }
        }
      }
      
      // Rollback!
      throw new Error("ROLLBACK_FOR_TESTING");
    });
  } catch (e: any) {
    if (e.message !== "ROLLBACK_FOR_TESTING") {
      console.error("FAILED WITH ERROR:", e);
    } else {
      console.log("SUCCESS! No errors before rollback.");
    }
  }
}

main().finally(() => prisma.$disconnect());
