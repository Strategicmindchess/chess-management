import { prisma } from '../lib/prisma';

async function checkDuplicates() {
  console.log("Checking for duplicate ClassFeedbacks in production DB...");
  const duplicates = await prisma.$queryRaw`
    SELECT classLogId, studentProfileId, COUNT(*) as count
    FROM class_feedbacks
    GROUP BY classLogId, studentProfileId
    HAVING COUNT(*) > 1;
  `;
  console.log("Duplicates found:", duplicates);
  
  const total = await prisma.$queryRaw`SELECT COUNT(*) as count FROM class_feedbacks`;
  console.log("Total feedbacks in DB:", total);
  
  process.exit(0);
}

checkDuplicates().catch(e => {
  console.error(e);
  process.exit(1);
});
