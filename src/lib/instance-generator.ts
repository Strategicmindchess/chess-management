import { startOfDay, Day, addDays } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { TIME_ZONE } from './timezone';
import { prisma } from './prisma';
import { SYLLABUS_MAP, type BatchLevel as SyllabusLevelType } from './syllabus';
import { Weekday } from './enums';

/**
 * Generates future class instances for a batch.
 *
 * SESSION NUMBERING — 1-based throughout:
 *   - batch.startSession = 1 means "this batch starts from Lecture 1"
 *   - batch.startSession = 4 means "this batch starts from Lecture 4"
 *   - SYLLABUS_MAP[level].topics[4] = "Lecture 4: ..." (1-based record)
 *   - Each ClassInstance stores sessionNumber (1-based) directly
 *
 * @param batchId              - The batch to generate instances for.
 * @param count                - How many instances to create.
 * @param customStartDate      - If supplied, start generating from this date (skips auto-detect).
 * @param overrideStartSession - When supplied by the worker after a resync, this 1-based session
 *                               number is used directly as the starting point. When omitted
 *                               (normal "generate more" flow), the session is calculated as
 *                               batch.startSession + count of existing instances.
 */
export async function generateInstancesInternal(
  batchId: string,
  count: number,
  customStartDate?: Date,
  overrideStartSession?: number,
) {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: { schedules: true },
  });

  if (!batch || batch.schedules.length === 0) {
    return;
  }

  // ── 1. Starting Date Calculation ───────────────────────────────────────────
  // We need to know from which date to start checking for scheduled days.
  let startDate: Date;
  if (customStartDate) {
    // A. Explicit Override: If a specific start date is provided (e.g. for fixing schedules), use it.
    startDate = fromZonedTime(startOfDay(toZonedTime(customStartDate, TIME_ZONE)), TIME_ZONE);
  } else {
    // B. Auto-Detect: Find the very last class that was ever created for this batch.
    const lastInstance = await prisma.classInstance.findFirst({
      where: { batchId },
      orderBy: { date: 'desc' },
    });
    
    if (lastInstance) {
      // If a previous class exists, start generating from the NEXT day after that class.
      startDate = fromZonedTime(startOfDay(toZonedTime(new Date(lastInstance.date), TIME_ZONE)), TIME_ZONE);
      startDate.setDate(startDate.getDate() + 1);
    } else {
      // C. Fresh Batch: If no classes exist yet, start from the batch's official startDate (or today).
      const baseDate = batch.startDate ? new Date(batch.startDate) : new Date();
      startDate = fromZonedTime(startOfDay(toZonedTime(baseDate, TIME_ZONE)), TIME_ZONE);
    }
  }

  // ── 2. De-duplication Cache (Existing Keys) ────────────────────────────────
  // To avoid accidentally scheduling two classes on the exact same date and time, 
  // we fetch all existing classes and store them in a Set as "YYYY-MM-DD|HH:MM".
  const existing = await prisma.classInstance.findMany({
    where: { batchId },
    select: { date: true, startTime: true },
  });

  const existingKeys = new Set(
    existing.map(
      (inst) => {
        const normalizedDate = fromZonedTime(startOfDay(toZonedTime(new Date(inst.date), TIME_ZONE)), TIME_ZONE);
        return `${normalizedDate.toISOString().split('T')[0]}|${inst.startTime}`;
      }
    ),
  );

  // ── Weekday map ────────────────────────────────────────────────────────────
  const WEEKDAY_MAP: Record<Weekday, Day> = {
    SUNDAY: 0,
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6,
  };

  // ── 3. Determine the Current Session Number ────────────────────────────────
  // We need to know what "Lecture Number" this new batch of classes should start from.
  let currentSession: number;
  
  if (overrideStartSession !== undefined) {
    // A. Explicit Override: Used by background workers when a syllabus changes or we force a start point.
    currentSession = overrideStartSession;
  } else {
    // B. Smart Resume: Find the highest session number assigned to ANY existing class (Completed or Scheduled).
    const lastSessionInst = await prisma.classInstance.findFirst({
      where: { batchId, sessionNumber: { not: null } },
      orderBy: { sessionNumber: 'desc' },
      select: { sessionNumber: true }
    });
    
    if (lastSessionInst?.sessionNumber) {
      // If we found a previous session, simply increment it by 1 to pick up exactly where we left off.
      currentSession = lastSessionInst.sessionNumber + 1;
    } else {
      // C. Fallback: If no previous sessions exist with a number, start from the batch's initial start point plus raw count.
      const batchStartSession: number = batch.startSession ?? 1;
      const existingCount = await prisma.classInstance.count({ where: { batchId } });
      currentSession = batchStartSession + existingCount;
    }
  }
 
  const syllabusLevel = batch.level as SyllabusLevelType | null;
  const topicsMap = syllabusLevel && SYLLABUS_MAP[syllabusLevel]
    ? SYLLABUS_MAP[syllabusLevel].topics
    : null;

  // ── 4. Generate the Future Classes Loop ────────────────────────────────────
  // We iterate day-by-day starting from `startDate`. If the current day matches the batch's 
  // weekly schedule (e.g., MONDAY), we generate a class for it, until we hit the requested `count`.
  const newInstances: {
    batchId: string;
    date: Date;
    startTime: string;
    endTime: string;
    status: 'SCHEDULED';
    lectureName: string | null;
    sessionNumber: number | null;
  }[] = [];

  let currentDate = new Date(startDate);
  let daysInspected = 0;

  // Safeguard: Stop searching after 730 days (2 years) to prevent infinite loops 
  // if a batch somehow has no valid schedules configured.
  while (newInstances.length < count && daysInspected < 730) {
    const zonedCurrent = toZonedTime(currentDate, TIME_ZONE);
    const dayOfWeek = zonedCurrent.getDay();
    
    // Find all schedules configured for this specific day of the week (e.g., all Monday schedules)
    const matchingSchedules = batch.schedules
      .filter((s) => WEEKDAY_MAP[s.day as Weekday] === dayOfWeek)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    for (const schedule of matchingSchedules) {
      if (newInstances.length >= count) break; // We have enough classes, stop generating!

      const dateStr = currentDate.toISOString().split('T')[0];
      const key = `${dateStr}|${schedule.startTime}`;

      // Only schedule the class if it doesn't already exist on this date/time (Deduplication)
      if (!existingKeys.has(key)) {
        // Look up the actual topic name from the syllabus based on the current session number (1-based)
        const lectureName = topicsMap ? (topicsMap[currentSession] ?? null) : null;

        newInstances.push({
          batchId,
          date: new Date(currentDate),
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          status: 'SCHEDULED',
          lectureName,
          sessionNumber: currentSession, // 1-based exact index
        });

        currentSession++;       // Move to the next lecture for the next generated class
        existingKeys.add(key);  // Mark this slot as used
      }
    }

    // Move to the next day and repeat
    currentDate = addDays(currentDate, 1);
    daysInspected++;
  }

  // ── 5. Save to Database ────────────────────────────────────────────────────
  if (newInstances.length > 0) {
    await prisma.classInstance.createMany({ data: newInstances });
  }
}

