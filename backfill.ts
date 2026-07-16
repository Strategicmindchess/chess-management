import { prisma } from './src/lib/prisma';
import { addWeeks, nextDay, startOfDay } from 'date-fns';
import type { Day } from 'date-fns';
import { Weekday } from './src/lib/enums';

const WEEKDAY_MAP: Record<Weekday, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

async function backfill() {
  const batches = await prisma.batch.findMany({
    include: {
      schedules: true,
      classInstances: true,
    }
  });

  const today = startOfDay(new Date());

  for (const batch of batches) {
    if (batch.classInstances.length === 0 && batch.schedules.length > 0) {
      console.log(`Backfilling instances for batch: ${batch.name} (${batch.id})`);
      const classInstancesData: any[] = [];
      
      for (const schedule of batch.schedules) {
        const targetDay = WEEKDAY_MAP[schedule.day as Weekday];
        let current = today.getDay() === targetDay ? today : nextDay(today, targetDay as Day);
        
        // Generate for 26 weeks
        for (let i = 0; i < 26; i++) {
          classInstancesData.push({
            batchId: batch.id,
            date: current,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            status: "SCHEDULED",
          });
          current = addWeeks(current, 1);
        }
      }

      await prisma.classInstance.createMany({
        data: classInstancesData,
      });
      console.log(`Generated ${classInstancesData.length} instances for ${batch.name}`);
    }
  }
  console.log("Done.");
}

backfill().catch(console.error);
