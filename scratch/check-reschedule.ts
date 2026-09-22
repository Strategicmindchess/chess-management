import { PrismaClient } from '@prisma/client';
import { getISTDayBounds } from './src/lib/timezone';
import { toZonedTime } from 'date-fns-tz';
import { getHours, getMinutes } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  const { today, tomorrow } = getISTDayBounds();
  console.log("DB Query Bounds (Today):", { today, tomorrow });

  const req = await prisma.coachRescheduleRequest.findFirst({
    where: { status: 'APPROVED' },
    orderBy: { reviewedAt: 'desc' },
    include: { classInstance: true }
  });

  if (!req) {
    console.log("No approved reschedule requests found.");
    return;
  }
  
  console.log("Latest Approved Reschedule Request:", {
    id: req.id,
    proposedDate: req.proposedDate,
    proposedStartTime: req.proposedStartTime,
    proposedEndTime: req.proposedEndTime,
  });
  
  console.log("Associated ClassInstance currently in DB:", {
    id: req.classInstance.id,
    date: req.classInstance.date,
    startTime: req.classInstance.startTime,
    endTime: req.classInstance.endTime,
    status: req.classInstance.status,
  });

  const isToday = req.classInstance.date >= today && req.classInstance.date < tomorrow;
  console.log("Is the class date between today and tomorrow bounds?", isToday);

  const TIME_ZONE = "Asia/Kolkata";
  const istNow = toZonedTime(new Date(), TIME_ZONE);
  const currentHour = getHours(istNow);
  const currentMin = getMinutes(istNow);
  
  console.log("Current IST Time (simulated):", { currentHour, currentMin });
  
  const [endH, endM] = req.classInstance.endTime.split(':').map(Number);
  const isEnded = currentHour > endH || (currentHour === endH && currentMin >= endM);
  console.log("Would filteredTodayInstances hide it because it ended?", isEnded);
}

main().catch(console.error).finally(() => prisma.$disconnect());
