import { PrismaClient } from '@prisma/client';
import { getISTDayBounds } from '../src/lib/timezone';
import { toZonedTime } from 'date-fns-tz';
import { getHours, getMinutes } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  const { today, tomorrow } = getISTDayBounds();
  console.log("-----------------------------------------");
  console.log("1. DATABASE BOUNDS FOR 'TODAY'");
  console.log("gte:", today.toISOString());
  console.log("lt:", tomorrow.toISOString());
  console.log("-----------------------------------------");

  const todayClasses = await prisma.classInstance.findMany({
    where: {
      status: { in: ['SCHEDULED', 'CANCELLED'] },
      date: { gte: today, lt: tomorrow }
    },
    include: { batch: { select: { name: true, coachProfileId: true } } }
  });

  console.log(2. CLASSES FOUND IN DB FOR TODAY: );
  todayClasses.forEach(c => {
    console.log( - ID: , Batch: , Date: , Time:  to , Status: );
  });
  console.log("-----------------------------------------");

  const recentRequests = await prisma.coachRescheduleRequest.findMany({
    where: { status: 'APPROVED' },
    orderBy: { reviewedAt: 'desc' },
    take: 3,
    include: { classInstance: { include: { batch: { select: { name: true } } } } }
  });

  console.log(3. RECENT APPROVED RESCHEDULE REQUESTS: );
  for (const req of recentRequests) {
    console.log(\nRequest ID: );
    console.log(Proposed: Date=, Time= to );
    console.log(Actual ClassInstance in DB:);
    const c = req.classInstance;
    console.log( - ID: , Batch: , Date: , Time:  to , Status: );
    
    const isToday = c.date >= today && c.date < tomorrow;
    console.log( -> Is this class within today's DB bounds? );

    if (isToday) {
      const TIME_ZONE = 'Asia/Kolkata';
      const istNow = toZonedTime(new Date(), TIME_ZONE);
      const currentHour = getHours(istNow);
      const currentMin = getMinutes(istNow);
      
      const [endH, endM] = c.endTime.split(':').map(Number);
      const isEnded = currentHour > endH || (currentHour === endH && currentMin >= endM);
      console.log( -> Would the frontend 'filteredTodayInstances' hide this? );
      if (isEnded) {
        console.log(    (Because current time : is past :));
      } else {
        console.log(    (Because current time : is BEFORE :));
      }
    } else {
        console.log(" -> This class is NOT for today in the database!");
    }
  }
}

main().catch(console.error).finally(async () => { await prisma.$disconnect(); });
