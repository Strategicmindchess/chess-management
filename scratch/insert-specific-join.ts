import { prisma } from '../src/lib/prisma';

async function main() {
  const coachProfileId = 'cmrxdb6oe0008uxukt7aljacb';
  const classInstanceId = 'cms7ig502002804l77h44onic';

  // The correct start time is 21:30 IST (which is 16:00 UTC) on Sep 18, 2026
  const correctTime = new Date('2026-09-18T16:00:00.000Z'); 

  console.log(`--- UPDATING TIME TO 21:30 IST ---`);

  // 1. Update the Class Instance date and startedAt
  await prisma.classInstance.update({
    where: { id: classInstanceId },
    data: { 
      date: correctTime,
      startedAt: correctTime
    }
  });
  console.log(`✅ Updated classInstance.date and startedAt to ${correctTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);

  // 2. Update the Join Event joinedAt if it exists
  const existingJoin = await prisma.classJoinEvent.findFirst({
    where: { classInstanceId: classInstanceId, coachProfileId: coachProfileId }
  });

  if (existingJoin) {
    await prisma.classJoinEvent.update({
      where: { id: existingJoin.id },
      data: { joinedAt: correctTime }
    });
    console.log(`✅ Updated existing classJoinEvent.joinedAt to ${correctTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
  } else {
    // If it doesn't exist for some reason, create it
    await prisma.classJoinEvent.create({
      data: {
        classInstanceId: classInstanceId,
        coachProfileId: coachProfileId,
        joinedAt: correctTime,
        source: "MANUAL_FIX_NO_FINE"
      }
    });
    console.log(`✅ Created classJoinEvent with joinedAt set to ${correctTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
  }

  console.log(`\nAll done! The class is perfectly scheduled and joined at 21:30 IST with no fines.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
