import { config } from 'dotenv';
config();
import { prisma } from '../src/lib/prisma';

async function main() {
  const user = await prisma.user.findFirst({
    where: { name: { contains: 'ayush kumar', mode: 'insensitive' } },
    include: { coachProfile: true }
  });

  if (!user || !user.coachProfile) return;

  const coachId = user.coachProfile.id;
  const classes = await prisma.classInstance.findMany({
    where: {
      batch: { coachProfileId: coachId },
      date: {
        gte: new Date('2026-08-17T00:00:00Z'),
        lte: new Date('2026-08-19T23:59:59Z')
      }
    },
    include: { batch: true },
    orderBy: { date: 'asc' }
  });

  console.log("Classes for Ayush Kumar around Aug 18, 2026:");
  classes.forEach(c => {
    console.log(`- ID: ${c.id} | Batch: ${c.batch.name} | Date: ${c.date.toISOString()} | Status: ${c.status}`);
  });
}

main().finally(() => prisma.$disconnect());
