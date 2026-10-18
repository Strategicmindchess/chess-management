import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { prisma } from '../src/lib/prisma';
import { getISTDayBounds } from '../src/lib/timezone';

async function main() {
  const { today, tomorrow } = getISTDayBounds();
  console.log('Today IST bounds:', today.toISOString(), 'to', tomorrow.toISOString());

  const coach = await prisma.user.findFirst({
    where: { email: 'coach@gmail.com' },
    include: { coachProfile: true },
  });

  if (!coach || !coach.coachProfile) {
    console.log('Coach not found');
    return;
  }

  const classes = await prisma.classInstance.findMany({
    where: {
      batch: { coachProfileId: coach.coachProfile.id },
    },
    include: {
      batch: {
        include: {
          students: { include: { student: { include: { user: true } } } },
        },
      },
    },
    orderBy: { date: 'desc' },
    take: 10,
  });

  console.log(`Found ${classes.length} classes for coach:`);
  for (const c of classes) {
    console.log(`- ID: ${c.id} | Batch: ${c.batch.name} | Date: ${c.date.toISOString().split('T')[0]} | Time: ${c.startTime}-${c.endTime} | reminderSentAt: ${c.reminderSentAt}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
