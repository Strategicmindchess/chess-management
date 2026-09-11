import { prisma } from "../lib/prisma";
import "dotenv/config";

async function main() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // Find all ClassLogs for today
  const todayClassLogs = await prisma.classLog.findMany({
    where: {
      date: {
        gte: todayStart,
        lte: todayEnd,
      },
      classInstance: {
        status: "COMPLETED",
      }
    },
    include: {
      batch: {
        include: {
          students: {
            include: {
              student: {
                include: {
                  user: true
                }
              }
            }
          }
        }
      },
      classFeedbacks: true,
    }
  });

  console.log(`\n=== FOUND ${todayClassLogs.length} COMPLETED CLASSES TODAY ===\n`);

  for (const log of todayClassLogs) {
    console.log(`Class: ${log.batch.name} - Topic: ${log.topicCovered}`);
    
    // Students in this batch
    const allStudents = log.batch.students;
    
    // Feedbacks received
    const submittedFeedbackStudentIds = new Set(log.classFeedbacks.map(f => f.studentProfileId));
    
    const pendingStudents = allStudents.filter(s => !submittedFeedbackStudentIds.has(s.studentProfileId));
    const submittedStudents = allStudents.filter(s => submittedFeedbackStudentIds.has(s.studentProfileId));

    console.log(`  Total Students Enrolled: ${allStudents.length}`);
    
    if (submittedStudents.length > 0) {
      console.log(`  ✅ Submitted Feedback:`);
      submittedStudents.forEach(s => console.log(`     - ${s.student.user.name} (${s.student.user.email})`));
    }
    
    if (pendingStudents.length > 0) {
      console.log(`  ⏳ Pending Feedback:`);
      pendingStudents.forEach(s => console.log(`     - ${s.student.user.name} (${s.student.user.email})`));
    } else if (allStudents.length > 0) {
      console.log(`  🎉 All students submitted feedback!`);
    } else {
      console.log(`  No students in this batch.`);
    }
    console.log("---------------------------------------------------");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

