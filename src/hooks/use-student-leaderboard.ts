import useSWR, { mutate } from "swr";

export const STUDENT_LEADERBOARD_KEY = "/api/student/leaderboard";

export type StudentLeaderboardResponse = {
  hasLinkedAccounts: boolean;
  chessAccount: any;
  studentProfile: any;
  monthlyData: any;
  weeklyData: any;
  refreshStatus: any;
  coachFeedback: any;
  puzzleSolverAward: any;
};

export function useStudentLeaderboard() {
  const { data, error, isLoading } = useSWR<StudentLeaderboardResponse>(STUDENT_LEADERBOARD_KEY);

  return {
    data,
    isLoading,
    error,
  };
}

export function invalidateStudentLeaderboard() {
  return mutate(STUDENT_LEADERBOARD_KEY);
}
