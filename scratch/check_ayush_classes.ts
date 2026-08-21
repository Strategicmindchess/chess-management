import { config } from 'dotenv';
config();
import { prisma } from '../src/lib/prisma';

async function main() {
  const user = await prisma.user.findFirst({
    where: { name: { contains: 'ayush kumar', mode: 'insensitive' } },
    include: {
      coachProfile: true,
      studentProfile: true,
    }
  });

  if (!user || !user.coachProfile) {
    console.log("Coach Ayush Kumar not found.");
    return;
  }

  const coachId = user.coachProfile.id;
  const classes = await prisma.classInstance.findMany({
    where: {
      batch: { coachProfileId: coachId }
    },
    include: { batch: true },
    orderBy: { date: 'desc' },
    take: 10
  });

  console.log("Recent classes for Ayush Kumar:");
  classes.forEach(c => {
    console.log(`- Batch: ${c.batch.name} | Date: ${c.date.toISOString()} | Status: ${c.status}`);
  });
}

main().finally(() => prisma.$disconnect());
