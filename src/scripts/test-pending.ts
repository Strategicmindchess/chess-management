import { prisma } from '../lib/prisma';

async function testQuery() {
  const email = 'shivamgupta.dev12@gmail.com';
  const user = await prisma.user.findUnique({
    where: { email },
    include: { studentProfile: true },
  });

  if (!user || !user.studentProfile) {
    console.log("No student profile");
    return;
  }

  console.log("Student Profile ID:", user.studentProfile.id);

  const pendingClassLogs = await prisma.classLog.findMany({
    where: {
      classInstance: {
        status: "COMPLETED",
      },
      batch: {
        students: {
          some: {
            studentProfileId: user.studentProfile.id,
          },
        },
      },
      classFeedbacks: {
        none: {
          studentProfileId: user.studentProfile.id,
        },
      },
    }
  });

  console.log("Pending logs count:", pendingClassLogs.length);
  
  // Let's also check if they are in the batch
  const batchStudents = await prisma.batchStudent.findMany({
    where: { studentProfileId: user.studentProfile.id }
  });
  console.log("Batches for student:", batchStudents.length);

  const feedbacks = await prisma.classFeedback.count({
    where: { studentProfileId: user.studentProfile.id }
  });
  console.log("Feedbacks submitted by student:", feedbacks);

  const classLogs = await prisma.classLog.count({
    where: { batch: { students: { some: { studentProfileId: user.studentProfile.id } } } }
  });
  console.log("Total class logs in batch:", classLogs);

  const pendingWithoutClassFeedbacksFilter = await prisma.classLog.count({
    where: {
      classInstance: { status: "COMPLETED" },
      batch: { students: { some: { studentProfileId: user.studentProfile.id } } }
    }
  });
  console.log("Total COMPLETED class logs in batch:", pendingWithoutClassFeedbacksFilter);

}

testQuery().finally(() => prisma.$disconnect());
