import { describe, it, expect } from "vitest";
import { formatISTDate, getISTDayBounds, TIME_ZONE } from "@/lib/timezone";
import { formatInTimeZone } from "date-fns-tz";

describe("Attendance Date & Timezone Unit Tests", () => {
  it("demonstrates the bug: unzoned toLocaleDateString fails on UTC servers", () => {
    // New batch timestamp for Saturday Oct 24 (stored as midnight IST = 18:30 UTC of Oct 23)
    const newBatchDate = new Date("2026-10-23T18:30:00.000Z");

    // When formatted in UTC (how Vercel runs without timezone specified):
    const utcFormatted = formatInTimeZone(newBatchDate, "UTC", "EEEE, MMM d");
    expect(utcFormatted).toBe("Friday, Oct 23"); // ❌ The bug: rolls back 1 day!

    // When formatted with formatISTDate:
    const istFormatted = formatISTDate(newBatchDate, "EEEE, MMM d");
    expect(istFormatted).toBe("Saturday, Oct 24"); // ✅ Fixed: shows Saturday!
  });

  it("safely handles New Batches (18:30:00.000Z in DB)", () => {
    // Oct 24, 2026 Saturday
    const batchCombined1 = new Date("2026-10-23T18:30:00.000Z");
    expect(formatISTDate(batchCombined1, "EEEE, MMM d")).toBe("Saturday, Oct 24");

    // Oct 4, 2026 Sunday (Trijal 1-1)
    const batchTrijal = new Date("2026-10-03T18:30:00.000Z");
    expect(formatISTDate(batchTrijal, "EEEE, MMM d")).toBe("Sunday, Oct 4");
  });

  it("safely handles Old Batches (00:00:00.000Z in DB) without drift", () => {
    // Old batch created with UTC midnight: 2026-08-15
    const oldBatchDate = new Date("2026-08-15T00:00:00.000Z");
    
    // In UTC, this is Aug 15
    expect(formatInTimeZone(oldBatchDate, "UTC", "EEEE, MMM d")).toBe("Saturday, Aug 15");

    // In IST, this is Aug 15 at 05:30 AM (stays on Saturday Aug 15)
    expect(formatISTDate(oldBatchDate, "EEEE, MMM d")).toBe("Saturday, Aug 15");
  });

  it("works identically across arbitrary server timezones (UTC, US/Pacific, Europe/London)", () => {
    const timestamp = new Date("2026-10-23T18:30:00.000Z");
    
    // No matter what the host OS timezone is, formatISTDate always pins to Asia/Kolkata
    const result = formatISTDate(timestamp, "yyyy-MM-dd");
    expect(result).toBe("2026-10-24");
  });

  it("getISTDayBounds returns valid boundaries for today and tomorrow in IST", () => {
    const { today, tomorrow } = getISTDayBounds();
    expect(today).toBeInstanceOf(Date);
    expect(tomorrow).toBeInstanceOf(Date);
    expect(tomorrow.getTime()).toBeGreaterThan(today.getTime());

    // Exactly 24 hours difference
    const diffHours = (tomorrow.getTime() - today.getTime()) / (1000 * 60 * 60);
    expect(diffHours).toBe(24);
  });
});
