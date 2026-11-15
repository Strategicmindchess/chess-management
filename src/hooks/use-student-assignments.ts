import useSWR, { mutate } from "swr";

export const STUDENT_ASSIGNMENTS_KEY = "/api/student/assignments";

export type AssignmentItem = {
  id: string;
  title: string;
  description: string | null;
  url: string;
  type: string;
  lectureNumber: number | null;
  batchName: string;
  status: "PENDING" | "COMPLETED" | "PREVIOUS";
  completionLevel: "NOT_DONE" | "HALF_DONE" | "FULLY_DONE";
  completedAt: Date | string | null;
  releasedAt: Date | string | null;
  dueDate: Date | string | null;
  isOverdue: boolean;
  remainingHours: number;
};

export type StudentAssignmentsResponse = {
  success: boolean;
  assignments: AssignmentItem[];
  progress: {
    total: number;
    score: number;
    percentage: number;
  };
};

export function useStudentAssignments() {
  const { data, error, isLoading, mutate: refetch } = useSWR<StudentAssignmentsResponse>(
    STUDENT_ASSIGNMENTS_KEY
  );

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}

export function invalidateStudentAssignments() {
  return mutate(STUDENT_ASSIGNMENTS_KEY);
}
