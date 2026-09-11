import useSWR, { mutate } from "swr";

export function getTeacherLeaderboardKey(period: "MONTHLY" | "WEEKLY") {
  return `/api/teacher/leaderboard?period=${period}`;
}

export type TeacherLeaderboardResponse = {
  leaderboardData: any;
  myStudentIds: string[];
  myStudents: any[];
  feedbackMap: Record<string, any>;
  periodStart: string;
};

export function useTeacherLeaderboard(period: "MONTHLY" | "WEEKLY") {
  const key = getTeacherLeaderboardKey(period);
  const { data, error, isLoading } = useSWR<TeacherLeaderboardResponse>(key);

  return {
    data,
    isLoading,
    error,
  };
}

export function invalidateTeacherLeaderboard(period: "MONTHLY" | "WEEKLY") {
  return mutate(getTeacherLeaderboardKey(period));
}

