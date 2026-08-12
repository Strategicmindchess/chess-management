/**
 * Leaderboard period utility helpers.
 * Plain module — NOT a server action file.
 */

export function getCurrentPeriod(type: 'WEEKLY' | 'MONTHLY'): {
  periodStart: Date;
  periodEnd: Date;
} {
  const now = new Date();

  if (type === 'WEEKLY') {
    // Monday-based week
    const day = now.getDay(); // 0=Sun
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return { periodStart: monday, periodEnd: sunday };
  } else {
    // Monthly: 1st to last day of current month
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { periodStart, periodEnd };
  }
}
