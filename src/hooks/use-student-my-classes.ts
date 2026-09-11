import useSWR, { mutate } from "swr";

export const STUDENT_MY_CLASSES_KEY = "/api/student/my-classes";

export type StudentDashboardResponse = {
  todayInstances: any[];
  upcomingInstances: any[];
  assignments: any[];
};

export function useStudentMyClasses() {
  const { data, error, isLoading } = useSWR<StudentDashboardResponse>(STUDENT_MY_CLASSES_KEY);

  return {
    data,
    isLoading,
    error,
  };
}

export function invalidateStudentMyClasses() {
  return mutate(STUDENT_MY_CLASSES_KEY);
}

