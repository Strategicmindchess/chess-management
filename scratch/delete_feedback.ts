import { config } from 'dotenv';
config(); // Load .env
import { prisma } from '../src/lib/prisma';

async function main() {
  const student = await prisma.studentProfile.findFirst({
    where: { user: { name: 'Fiona Bhatt' } },
  });

  if (!student) {
    console.log("Fiona Bhatt not found.");
    return;
  }

  const deleted = await prisma.coachFeedback.deleteMany({
    where: { studentProfileId: student.id },
  });

  console.log(`Deleted ${deleted.count} feedback entries for Fiona Bhatt.`);

  // Clear redis cache for this period to ensure it recalculates
  // Actually, recalculation uses DB, so the next cron job or manual trigger will fix it.
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
