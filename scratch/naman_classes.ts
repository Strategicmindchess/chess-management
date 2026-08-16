import { prisma } from '../src/lib/prisma';
import { startOfDay, endOfDay } from 'date-fns';

async function main() {
  console.log('Finding coach Naman...');
  const user = await prisma.user.findFirst({
    where: {
      name: { contains: 'Naman', mode: 'insensitive' }
    },
    include: {
      coachProfile: true,
    }
  });

  if (!user || !user.coachProfile) {
    console.log('Could not find coach Naman.');
    return;
  }

  console.log(`Found Coach: ${user.name} (ID: ${user.coachProfile.id})`);

  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  console.log(`Fetching classes for today (${todayStart.toISOString()} - ${todayEnd.toISOString()})...`);

  const classes = await prisma.classInstance.findMany({
    where: {
      date: {
        gte: todayStart,
        lte: todayEnd,
      },
      batch: {
        coachProfileId: user.coachProfile.id,
      },
    },
    include: {
      batch: true,
    },
    orderBy: {
      startTime: 'asc',
    }
  });

  if (classes.length === 0) {
    console.log('No classes scheduled for today.');
  } else {
    console.log(`\\n--- TODAY'S CLASSES (${classes.length}) ---`);
    classes.forEach(c => {
      console.log(`- [${c.startTime} - ${c.endTime}] ${c.batch.name} (Batch Code: ${c.batch.code}) - Status: ${c.status}`);
    });
  }
}

main().catch(console.error).finally(() => process.exit(0));
