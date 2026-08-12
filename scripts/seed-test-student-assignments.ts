import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Looking for test-1-student...");
  
  // Find the user
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { name: { contains: "test-1" } },
        { email: { contains: "test-1" } }
      ]
    }
  });

  if (!user) {
    console.error("Could not find user test-1-student");
    return;
  }

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id }
  });

  if (!profile) {
    console.error("Could not find StudentProfile for user", user.id);
    return;
  }

  console.log("Found profile:", profile.id);

  // Get the batches the student is enrolled in
  const enrollments = await prisma.batchStudent.findMany({
    where: { studentProfileId: profile.id }
  });

  if (enrollments.length === 0) {
    console.error("Student is not enrolled in any batches");
    return;
  }

  const batchId = enrollments[0].batchId;

  // Get batch assignments for this batch
  let batchAssignments = await prisma.batchAssignment.findMany({
    where: { batchId: batchId },
    take: 3
  });

  if (batchAssignments.length < 3) {
    console.log(`Not enough batch assignments in batch ${batchId}, creating them...`);
    const resources = await prisma.resource.findMany({ take: 3 });
    if (resources.length < 3) {
      console.error("Not enough resources in DB to create batch assignments. Run seed-assignments first.");
      return;
    }
    
    // Create missing batch assignments
    for (let i = batchAssignments.length; i < 3; i++) {
      const resource = resources[i];
      const ba = await prisma.batchAssignment.create({
        data: {
          batchId: batchId,
          resourceId: resource.id,
          lectureNumber: i + 1,
          releasedAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      });
      batchAssignments.push(ba);
    }
  }

  console.log("Creating/updating student assignments...");

  // 1. Completed
  await prisma.studentAssignment.upsert({
    where: {
      batchAssignmentId_studentProfileId: {
        batchAssignmentId: batchAssignments[0].id,
        studentProfileId: profile.id
      }
    },
    update: {
      status: "COMPLETED",
      completionLevel: "FULLY_DONE",
      completedAt: new Date(),
    },
    create: {
      batchAssignmentId: batchAssignments[0].id,
      studentProfileId: profile.id,
      status: "COMPLETED",
      completionLevel: "FULLY_DONE",
      completedAt: new Date(),
    }
  });

  // 2. Half Done
  await prisma.studentAssignment.upsert({
    where: {
      batchAssignmentId_studentProfileId: {
        batchAssignmentId: batchAssignments[1].id,
        studentProfileId: profile.id
      }
    },
    update: {
      status: "PENDING",
      completionLevel: "HALF_DONE",
      completedAt: null,
    },
    create: {
      batchAssignmentId: batchAssignments[1].id,
      studentProfileId: profile.id,
      status: "PENDING",
      completionLevel: "HALF_DONE",
      completedAt: null,
    }
  });

  // 3. Not Done
  await prisma.studentAssignment.upsert({
    where: {
      batchAssignmentId_studentProfileId: {
        batchAssignmentId: batchAssignments[2].id,
        studentProfileId: profile.id
      }
    },
    update: {
      status: "PENDING",
      completionLevel: "NOT_DONE",
      completedAt: null,
    },
    create: {
      batchAssignmentId: batchAssignments[2].id,
      studentProfileId: profile.id,
      status: "PENDING",
      completionLevel: "NOT_DONE",
      completedAt: null,
    }
  });

  // Make sure these batch assignments are released
  for (const ba of batchAssignments) {
    await prisma.batchAssignment.update({
      where: { id: ba.id },
      data: { releasedAt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // released yesterday
    });
  }

  console.log("Successfully seeded assignments for test-1-student");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
