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
    // Monday-based week (UTC)
    const day = now.getUTCDay(); // 0=Sun
    const mondayOffset = day === 0 ? -6 : 1 - day;
    
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + mondayOffset, 0, 0, 0, 0));
    const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + mondayOffset + 6, 23, 59, 59, 999));

    return { periodStart, periodEnd };
  } else {
    // Monthly: 1st to last day of current month (UTC)
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    
    return { periodStart, periodEnd };
  }
}

