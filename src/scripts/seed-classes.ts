import { prisma } from '../lib/prisma';

async function main() {
  const studentEmail = 'shivamgupta.dev12@gmail.com';
  const coachEmail = 'teacher@gmail.com';

  const studentUser = await prisma.user.findUnique({ where: { email: studentEmail }, include: { studentProfile: true } });
  const coachUser = await prisma.user.findUnique({ where: { email: coachEmail }, include: { coachProfile: true } });

  if (!studentUser?.studentProfile || !coachUser?.coachProfile) {
    console.error("Student or Coach profile not found for the given emails.");
    return;
  }

  const studentProfileId = studentUser.studentProfile.id;
  const coachProfileId = coachUser.coachProfile.id;

  // Ensure a batch exists for this coach and student
  let batch = await prisma.batch.findFirst({
    where: {
      coachProfileId: coachProfileId,
      students: {
        some: {
          studentProfileId: studentProfileId
        }
      }
    }
  });

  if (!batch) {
    console.log("Creating a new batch for dummy classes...");
    batch = await prisma.batch.create({
      data: {
        name: "Test Batch for Feedback",
        code: "TEST-BATCH-" + Date.now(),
        meetLink: "https://meet.google.com/test-batch",
        coachProfileId: coachProfileId,
        type: "GROUP_SESSION",
        students: {
          create: {
            studentProfileId: studentProfileId
          }
        }
      }
    });
  }

  console.log(`Using Batch: ${batch.name} (${batch.id})`);

  // Create 10 COMPLETED class instances + logs for today
  const today = new Date();
  
  let createdCount = 0;
  for (let i = 0; i < 2; i++) {
    // stagger the times slightly so they are distinct
    const classTime = new Date(today.getTime() - (2 - i) * 60 * 60 * 1000); 
    const timeStr = classTime.toISOString().slice(11, 16); // HH:mm

    const classInstance = await prisma.classInstance.create({
      data: {
        batchId: batch.id,
        date: classTime,
        startTime: timeStr,
        endTime: "23:59",
        status: "COMPLETED",
        completedAt: classTime,
      }
    });

    await prisma.classLog.create({
      data: {
        batchId: batch.id,
        coachProfileId: coachProfileId,
        date: classTime,
        topicCovered: `Test Topic ${i + 1}`,
        durationMins: 60,
        classInstance: {
          connect: {
            id: classInstance.id
          }
        },
        coachJoinedAt: classTime,
        attendanceMarkedAt: new Date(classTime.getTime() + 10 * 60 * 1000), // 10 mins later
        attendance: {
          create: {
            studentProfileId: studentProfileId,
            status: "PRESENT",
          }
        }
      }
    });
    createdCount++;
  }

  console.log(`Created ${createdCount} completed class instances and logs.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
