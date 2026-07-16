import { Weekday } from './src/lib/enums';
import { addWeeks, nextDay, startOfDay } from 'date-fns';
import type { Day } from 'date-fns';
import { prisma } from './src/lib/prisma';

async function main() {
  console.log("Creating test2 batch...");

  // Get a coach
  const coach = await prisma.coachProfile.findFirst({
    include: { user: true }
  });

  if (!coach) {
    console.log("No coach found!");
    return;
  }

  // Get a student
  const student = await prisma.studentProfile.findFirst({
    include: { user: true }
  });

  if (!student) {
    console.log("No student found!");
    return;
  }

  const startDate = startOfDay(new Date());

  const createdBatch = await prisma.batch.create({
    data: {
      name: "test2",
      code: "TEST-2",
      meetLink: "https://meet.google.com/test-2",
      startDate: startDate,
      payoutRate: 500,
      coachProfileId: coach.id,
      schedules: {
        create: [
          {
            // Add a schedule for TODAY so we can test attendance right away
            day: [
              Weekday.SUNDAY,
              Weekday.MONDAY,
              Weekday.TUESDAY,
              Weekday.WEDNESDAY,
              Weekday.THURSDAY,
              Weekday.FRIDAY,
              Weekday.SATURDAY
            ][startDate.getDay()],
            startTime: "00:00",
            endTime: "23:59", // All day so it's always valid to mark attendance
          }
        ],
      },
      students: {
        create: {
          studentProfileId: student.id
        }
      }
    },
    include: {
      schedules: true
    }
  });

  console.log("Batch created:", createdBatch.id);

  const WEEKDAY_MAP: Record<Weekday, number> = {
    SUNDAY: 0,
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6,
  };

  const WEEKS_TO_GENERATE = 26; // 6 months
  
  const classInstancesData: any[] = [];
  for (const schedule of createdBatch.schedules) {
    const targetDay = WEEKDAY_MAP[schedule.day as Weekday];
    let current = startDate.getDay() === targetDay ? startDate : nextDay(startDate, targetDay as Day);

    for (let i = 0; i < WEEKS_TO_GENERATE; i++) {
      classInstancesData.push({
        batchId: createdBatch.id,
        date: current,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
      });
      current = addWeeks(current, 1);
    }
  }

  if (classInstancesData.length > 0) {
    await prisma.classInstance.createMany({
      data: classInstancesData,
    });
    console.log(`Generated ${classInstancesData.length} class instances.`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
