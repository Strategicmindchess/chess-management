import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  const coachEmail = 'teacher@gmail.com';
  const coachUser = await prisma.user.findUnique({ where: { email: coachEmail }, include: { coachProfile: true } });

  if (!coachUser?.coachProfile) {
    console.error("Coach profile not found");
    return;
  }
  const coachProfileId = coachUser.coachProfile.id;

  // Find the test batch
  const batch = await prisma.batch.findFirst({
    where: {
      coachProfileId: coachProfileId,
      name: "Test Batch for Feedback"
    },
    include: {
      classLogs: {
        orderBy: { date: 'desc' },
        take: 2 // get top 2 logs
      }
    }
  });

  if (!batch || batch.classLogs.length === 0) {
    console.error("Batch or class logs not found");
    return;
  }

  // Create 2 new students
  const students = [];
  for (let i = 1; i <= 2; i++) {
    const email = `test.student${i}@gmail.com`;
    let user = await prisma.user.findUnique({ where: { email }, include: { studentProfile: true } });
    if (!user) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      user = await prisma.user.create({
        data: {
          name: `Test Student ${i}`,
          email,
          passwordHash: hashedPassword,
          role: "STUDENT",
          studentProfile: {
            create: {}
          }
        },
        include: { studentProfile: true }
      });
    }
    students.push(user);
    
    // Add to batch if not enrolled
    const enrolled = await prisma.batchStudent.findUnique({
      where: {
        batchId_studentProfileId: {
          batchId: batch.id,
          studentProfileId: user.studentProfile!.id
        }
      }
    });

    if (!enrolled) {
      await prisma.batchStudent.create({
        data: {
          batchId: batch.id,
          studentProfileId: user.studentProfile!.id
        }
      });
    }
  }

  // Add them to the recent class logs and generate feedbacks
  let createdFeedbacks = 0;
  for (const log of batch.classLogs) {
    for (const student of students) {
      const studentProfileId = student.studentProfile!.id;
      
      // Ensure attendance exists
      const att = await prisma.attendanceRecord.findUnique({
        where: {
          classLogId_studentProfileId: {
            classLogId: log.id,
            studentProfileId
          }
        }
      });
      if (!att) {
        await prisma.attendanceRecord.create({
          data: {
            classLogId: log.id,
            studentProfileId,
            status: "PRESENT"
          }
        });
      }

      // Check if feedback exists
      const fb = await prisma.classFeedback.findUnique({
        where: {
          classLogId_studentProfileId: {
            classLogId: log.id,
            studentProfileId
          }
        }
      });

      if (!fb) {
        await prisma.classFeedback.create({
          data: {
            classLogId: log.id,
            studentProfileId,
            cameraOffOver5Min: true, // we set camera off to test penalty
            phoneUsedOver4Times: true, // set phone used to test penalty
            classQualityScore: 5,
            conceptUnderstood: true,
          }
        });
        createdFeedbacks++;
      }
    }
  }

  console.log(`Created ${createdFeedbacks} feedbacks from 2 test students!`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
