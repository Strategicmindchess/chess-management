import { addDays } from "date-fns";
import { toZonedTime, fromZonedTime, formatInTimeZone } from "date-fns-tz";

export const TIME_ZONE = "Asia/Kolkata";

/**
 * Returns midnight in Asia/Kolkata for any given date or string as a UTC Date.
 * E.g., for "2026-10-15", returns UTC timestamp 2026-10-14T18:30:00.000Z.
 * CRITICAL: This is 100% deterministic and does NOT depend on the host machine's timezone (US, UTC, etc.).
 */
export function getISTStartOfDay(d: Date | string = new Date()): Date {
  const dateStr = formatInTimeZone(new Date(d), TIME_ZONE, "yyyy-MM-dd");
  return fromZonedTime(`${dateStr} 00:00:00`, TIME_ZONE);
}

/**
 * Returns the current date/time mapped to Asia/Kolkata
 */
export function getISTNow(): Date {
  return toZonedTime(new Date(), TIME_ZONE);
}

/**
 * Returns today's boundaries (midnight to midnight) exactly in Asia/Kolkata timezone.
 * Guaranteed to be identical on US servers, local machines, or anywhere in the world.
 */
export function getISTDayBounds() {
  const todayStart = getISTStartOfDay(new Date());
  const tomorrowStart = addDays(todayStart, 1);
  const threeDaysLater = addDays(tomorrowStart, 3);

  return {
    istNow: toZonedTime(new Date(), TIME_ZONE),
    today: todayStart,
    tomorrow: tomorrowStart,
    threeDaysLater
  };
}

/**
 * Formats a date explicitly in Asia/Kolkata timezone, regardless of server OS timezone.
 */
export function formatISTDate(date: Date | string, formatPattern: string = "yyyy-MM-dd"): string {
  return formatInTimeZone(new Date(date), TIME_ZONE, formatPattern);
}

/**
 * Converts a 24h time string (e.g. "17:00" or "09:30") to 12h user-friendly format (e.g. "5:00 PM", "9:30 AM")
 */
export function formatTime12h(timeStr: string): string {
  if (!timeStr || typeof timeStr !== "string") return "";
  const parts = timeStr.trim().split(":");
  if (parts.length < 2) return timeStr;

  const hour = parseInt(parts[0], 10);
  const minute = parseInt(parts[1], 10);
  if (isNaN(hour) || isNaN(minute)) return timeStr;

  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const displayMinute = minute.toString().padStart(2, "0");

  return `${displayHour}:${displayMinute} ${period}`;
}

/**
 * Formats a class start and end time range (e.g. "17:00" & "17:40" -> "5:00 PM – 5:40 PM")
 */
export function formatClassTiming(startTime: string, endTime: string): string {
  if (!startTime) return "";
  const formattedStart = formatTime12h(startTime);
  if (!endTime) return formattedStart;
  const formattedEnd = formatTime12h(endTime);
  return `${formattedStart} – ${formattedEnd}`;
}

/**
 * Returns current minutes of the day in IST (0 to 1439).
 * Uses formatInTimeZone so it works identically on US servers and Indian machines.
 */
export function getISTCurrentMinutes(): number {
  const timeStr = formatInTimeZone(new Date(), TIME_ZONE, "HH:mm");
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Returns a human-friendly date label using Asia/Kolkata calendar dates.
 * e.g. "Today", "Tomorrow", or "MMM d" (e.g. "Oct 17").
 * Never drifts due to US host machine timezone.
 */
export function getClassDateLabel(dateInput: Date | string): string {
  const instanceDateStr = formatInTimeZone(new Date(dateInput), TIME_ZONE, "yyyy-MM-dd");
  const todayDateStr = formatInTimeZone(new Date(), TIME_ZONE, "yyyy-MM-dd");
  const { tomorrow } = getISTDayBounds();
  const tomorrowDateStr = formatInTimeZone(tomorrow, TIME_ZONE, "yyyy-MM-dd");

  if (instanceDateStr === todayDateStr) {
    return "Today";
  }
  if (instanceDateStr === tomorrowDateStr) {
    return "Tomorrow";
  }
  return formatInTimeZone(new Date(dateInput), TIME_ZONE, "MMM d");
}

/**
 * Checks if a class date falls on Today in IST
 */
export function isClassToday(dateInput: Date | string): boolean {
  const instanceDateStr = formatInTimeZone(new Date(dateInput), TIME_ZONE, "yyyy-MM-dd");
  const todayDateStr = formatInTimeZone(new Date(), TIME_ZONE, "yyyy-MM-dd");
  return instanceDateStr === todayDateStr;
}

/**
 * Checks if a class is currently Live in IST (within 10 mins before start until end)
 */
export function isClassLive(dateInput: Date | string, startTime: string, endTime: string): boolean {
  if (!isClassToday(dateInput)) return false;

  const currentMins = getISTCurrentMinutes();
  const [startH, startM] = (startTime || "0:0").split(":").map(Number);
  const [endH, endM] = (endTime || "0:0").split(":").map(Number);
  const classStartMins = startH * 60 + startM;
  const classEndMins = endH * 60 + endM;

  return currentMins >= (classStartMins - 10) && currentMins <= classEndMins;
}

/**
 * Checks if a class has already ended in IST
 */
export function isClassPast(dateInput: Date | string, endTime: string): boolean {
  const instanceDateStr = formatInTimeZone(new Date(dateInput), TIME_ZONE, "yyyy-MM-dd");
  const todayDateStr = formatInTimeZone(new Date(), TIME_ZONE, "yyyy-MM-dd");

  if (instanceDateStr < todayDateStr) return true;
  if (instanceDateStr > todayDateStr) return false;

  const currentMins = getISTCurrentMinutes();
  const [endH, endM] = (endTime || "0:0").split(":").map(Number);
  const classEndMins = endH * 60 + endM;

  return currentMins > classEndMins;
}

/**
 * Returns current month string ("YYYY-MM") and the start/end timestamps of the month in Asia/Kolkata.
 * 100% deterministic on US servers and Indian machines alike.
 */
export function getISTMonthBounds(d: Date | string = new Date()) {
  const monthString = formatInTimeZone(new Date(d), TIME_ZONE, "yyyy-MM");
  const [yearStr, monthStr] = monthString.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const startOfMonth = fromZonedTime(`${monthString}-01 00:00:00`, TIME_ZONE);

  const nextMonthYear = month === 12 ? year + 1 : year;
  const nextMonthNum = month === 12 ? 1 : month + 1;
  const nextMonthStr = `${nextMonthYear}-${String(nextMonthNum).padStart(2, "0")}`;
  const startOfNextMonth = fromZonedTime(`${nextMonthStr}-01 00:00:00`, TIME_ZONE);
  const endOfMonth = new Date(startOfNextMonth.getTime() - 1);

  return {
    monthString,
    startOfMonth,
    endOfMonth,
  };
}
