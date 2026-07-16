import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { subDays } from 'date-fns';

async function main() {
  console.log("Seeding class logs and attendance...");

  // Get all active batches with their enrolled students
  const batches = await prisma.batch.findMany({
    where: { isActive: true },
    include: {
      students: { include: { student: true } }
    }
  });

  if (batches.length === 0) {
    console.log("No batches found to seed attendance.");
    return;
  }

  let totalLogs = 0;
  let totalRecords = 0;

  for (const batch of batches) {
    if (!batch.coachProfileId) continue;
    if (batch.students.length === 0) continue;

    // Create 3 past class logs for each batch
    for (let i = 1; i <= 3; i++) {
      const date = subDays(new Date(), i * 3); // 3, 6, 9 days ago
      
      const log = await prisma.classLog.create({
        data: {
          batchId: batch.id,
          coachProfileId: batch.coachProfileId,
          date,
          topicCovered: `Topic ${i} for ${batch.name}`,
          durationMins: 60,
          payoutAmount: 300,
        }
      });
      totalLogs++;

      // Create attendance records for each student in the batch
      for (const enrollment of batch.students) {
        // Randomly assign Present or Absent (80% chance of present)
        const isPresent = Math.random() > 0.2;
        
        await prisma.attendanceRecord.create({
          data: {
            classLogId: log.id,
            studentProfileId: enrollment.studentProfileId,
            status: isPresent ? 'PRESENT' : 'ABSENT',
          }
        });
        totalRecords++;
      }
    }
  }

  console.log(`Seeding complete: Created ${totalLogs} class logs and ${totalRecords} attendance records.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
