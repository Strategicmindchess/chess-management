import useSWR, { mutate } from "swr";

export const ADMIN_DASHBOARD_KEY = "/api/admin/dashboard";

export type AdminDashboardResponse = {
  stats: {
    studentCount: number;
    coachCount: number;
    activeBatchCount: number;
    employeeCount: number;
    pendingStudentTickets: number;
    pendingCoachTickets: number;
    pendingFees: number;
    todayClassCount: number;
    monthString: string;
    coachGross: number;
    staffNet: number;
    totalPayoutEstimate: number;
  };
  summary: {
    totalStudents: number;
    completedAll: number;
    missing: number;
  };
};

export function useAdminDashboard() {
  const { data, error, isLoading } = useSWR<AdminDashboardResponse>(ADMIN_DASHBOARD_KEY);

  return {
    data,
    isLoading,
    error,
  };
}

export function invalidateAdminDashboard() {
  return mutate(ADMIN_DASHBOARD_KEY);
}

