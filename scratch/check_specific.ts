import "dotenv/config";
import { prisma } from '../src/lib/prisma';

async function main() {
  const batchCode = "IND-AA2-26";
  
  const batch = await prisma.batch.findUnique({
    where: { code: batchCode },
    include: {
      students: {
        include: {
          student: {
            include: { user: true }
          }
        }
      }
    }
  });

  if (!batch) {
    console.log("Batch not found.");
    return;
  }
  
  console.log(`Batch: ${batch.name} (${batch.code})`);
  console.log(`Enrolled students: ${batch.students.length}`);

  const classLogs = await prisma.classLog.findMany({
    where: {
      batchId: batch.id,
      date: {
        gte: new Date("2026-09-12T00:00:00Z"),
        lte: new Date("2026-09-14T23:59:59Z")
      }
    },
    include: {
      classFeedbacks: {
        include: {
          student: { include: { user: true }}
        }
      }
    }
  });

  if (classLogs.length === 0) {
    console.log("No class log found around 13 Sep 2026");
    return;
  }

  for (const log of classLogs) {
    console.log(`ClassLog ID: ${log.id} on Date: ${log.date.toISOString()}`);
    console.log(`Feedbacks submitted: ${log.classFeedbacks.length}`);
    for (const f of log.classFeedbacks) {
      console.log(`- Feedback by ${f.student.user.name} (${f.student.user.email})`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
