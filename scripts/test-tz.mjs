import { startOfDay, addDays } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

const TIME_ZONE = "Asia/Kolkata";

function getISTNow() {
  return toZonedTime(new Date(), TIME_ZONE);
}

function getISTDayBounds() {
  const istNow = getISTNow();
  const todayStart = fromZonedTime(startOfDay(istNow), TIME_ZONE);
  const tomorrowStart = addDays(todayStart, 1);
  return { istNow, today: todayStart, tomorrow: tomorrowStart };
}

const bounds = getISTDayBounds();
console.log("Current system time:", new Date().toISOString());
console.log("bounds.today:       ", bounds.today.toISOString());
console.log("bounds.tomorrow:    ", bounds.tomorrow.toISOString());

// Test with classDate: 2026-10-18T13:00:00.000Z
const classDate1 = new Date("2026-10-18T13:00:00.000Z");
console.log("classDate1 in bounds?", classDate1 >= bounds.today && classDate1 < bounds.tomorrow);

// Test with classDate: 2026-10-17T13:00:00.000Z
const classDate2 = new Date("2026-10-17T13:00:00.000Z");
console.log("classDate2 in bounds?", classDate2 >= bounds.today && classDate2 < bounds.tomorrow);
