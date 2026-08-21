import { prisma } from '../src/lib/prisma';

async function main() {
  const user = await prisma.user.findFirst({
    where: { name: { contains: 'Rucha', mode: 'insensitive' } }
  });

  if (!user) {
    console.log("User Rucha Godse not found");
    return;
  }

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id }
  });

  if (!profile) {
    console.log("Student profile not found");
    return;
  }

  const batch = await prisma.batch.findFirst({
    where: { name: 'Rucha Ji 1-1' }
  });

  if (!batch) {
    console.log("Batch not found");
    return;
  }

  const assignment = await prisma.studentAssignment.findFirst({
    where: {
      studentProfileId: profile.id,
      batchAssignment: {
        batchId: batch.id,
        lectureNumber: 23
      }
    },
    include: {
      batchAssignment: {
        include: {
          resource: true
        }
      }
    }
  });

  if (!assignment) {
    console.log("Assignment for Lecture 23 not found for this student");
    return;
  }

  console.log("==== STUDENT ASSIGNMENT DATA SENT TO UI ====");
  console.log(`Title: ${assignment.batchAssignment.resource.title}`);
  console.log(`Source (Now showing as description in UI): ${assignment.batchAssignment.resource.source}`);
  console.log(`URL: ${assignment.batchAssignment.resource.url}`);
  console.log(`Status: ${assignment.status}`);
  console.log("============================================");
}

main().catch(console.error).finally(() => prisma.$disconnect());
