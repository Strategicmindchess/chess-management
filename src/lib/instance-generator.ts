import { startOfDay, Day } from 'date-fns';
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

  // ── Starting date ──────────────────────────────────────────────────────────
  let startDate: Date;
  if (customStartDate) {
    startDate = startOfDay(customStartDate);
  } else {
    const lastInstance = await prisma.classInstance.findFirst({
      where: { batchId },
      orderBy: { date: 'desc' },
    });
    if (lastInstance) {
      startDate = startOfDay(new Date(lastInstance.date));
      startDate.setDate(startDate.getDate() + 1); // Next day after latest
    } else {
      startDate = startOfDay(batch.startDate ? new Date(batch.startDate) : new Date());
    }
  }

  // ── Existing date+time keys (for de-duplication) ──────────────────────────
  const existing = await prisma.classInstance.findMany({
    where: { batchId },
    select: { date: true, startTime: true },
  });

  const existingKeys = new Set(
    existing.map(
      (inst) =>
        `${startOfDay(new Date(inst.date)).toISOString().split('T')[0]}|${inst.startTime}`,
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

  // ── Determine starting session number (1-based) ────────────────────────────
  // overrideStartSession: set by the worker for a user-triggered resync.
  //   The user said "start from session N" — honour it directly.
  // Normal flow: batch.startSession + how many instances already exist,
  //   so new classes continue the syllabus from where they left off.
  let currentSession: number;
  if (overrideStartSession !== undefined) {
    currentSession = overrideStartSession;
  } else {
    const batchStartSession: number = batch.startSession ?? 1;
    const existingCount = await prisma.classInstance.count({ where: { batchId } });
    currentSession = batchStartSession + existingCount;
  }

  const syllabusLevel = batch.level as SyllabusLevelType | null;
  const topicsMap = syllabusLevel && SYLLABUS_MAP[syllabusLevel]
    ? SYLLABUS_MAP[syllabusLevel].topics
    : null;

  // ── Build new instances ────────────────────────────────────────────────────
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

  while (newInstances.length < count && daysInspected < 730) {
    const dayOfWeek = currentDate.getDay();
    const matchingSchedules = batch.schedules
      .filter((s) => WEEKDAY_MAP[s.day as Weekday] === dayOfWeek)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    for (const schedule of matchingSchedules) {
      if (newInstances.length >= count) break;

      const dateStr = currentDate.toISOString().split('T')[0];
      const key = `${dateStr}|${schedule.startTime}`;

      if (!existingKeys.has(key)) {
        // topics[currentSession] is 1-based — no subtraction needed
        const lectureName = topicsMap ? (topicsMap[currentSession] ?? null) : null;

        newInstances.push({
          batchId,
          date: new Date(currentDate),
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          status: 'SCHEDULED',
          lectureName,
          sessionNumber: currentSession, // stored directly — 1-based
        });

        currentSession++;
        existingKeys.add(key);
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
    daysInspected++;
  }

  if (newInstances.length > 0) {
    await prisma.classInstance.createMany({ data: newInstances });
  }
}
