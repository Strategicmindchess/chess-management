import { startOfDay, addDays } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

export const TIME_ZONE = "Asia/Kolkata";

/**
 * Returns the current date/time mapped to Asia/Kolkata
 */
export function getISTNow(): Date {
  return toZonedTime(new Date(), TIME_ZONE);
}

/**
 * Returns today's boundaries (midnight to midnight) exactly in Asia/Kolkata timezone
 */
export function getISTDayBounds() {
  const istNow = getISTNow();
  const todayStart = fromZonedTime(startOfDay(istNow), TIME_ZONE);
  const tomorrowStart = addDays(todayStart, 1);
  const threeDaysLater = addDays(tomorrowStart, 3);
  
  return {
    istNow,
    today: todayStart,
    tomorrow: tomorrowStart,
    threeDaysLater
  };
}
