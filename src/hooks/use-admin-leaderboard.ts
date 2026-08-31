import useSWR, { mutate } from "swr";

export function getAdminLeaderboardKey(period: "MONTHLY" | "WEEKLY") {
  return `/api/admin/leaderboard?period=${period}`;
}

export type AdminLeaderboardResponse = {
  leaderboardData: any;
  calcLog: any;
  linkedCount: number;
  totalStudents: number;
  studentsWithStatus: any;
  periodStart: string;
};

export function useAdminLeaderboard(period: "MONTHLY" | "WEEKLY") {
  const key = getAdminLeaderboardKey(period);
  const { data, error, isLoading } = useSWR<AdminLeaderboardResponse>(key);

  return {
    data,
    isLoading,
    error,
  };
}

export function invalidateAdminLeaderboard(period: "MONTHLY" | "WEEKLY") {
  return mutate(getAdminLeaderboardKey(period));
}
