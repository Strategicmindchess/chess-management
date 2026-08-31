import useSWR, { mutate } from "swr";

export const PENDING_FEEDBACK_KEY = "/api/class-feedback/pending";

/**
 * Hook: usePendingFeedback
 *
 * Fetches the list of class logs for which the current student has not yet
 * submitted feedback. Cached globally — will NOT re-fetch on navigation or
 * focus change. Only resets on page refresh.
 *
 * After submitting feedback, call:
 *   invalidatePendingFeedback()
 * to remove the cached data so the modal disappears immediately.
 */
export function usePendingFeedback() {
  const { data, error, isLoading } = useSWR<{
    pendingClassLogs: Array<{
      id: string;
      classInstance: { date: string; startTime: string; endTime: string };
      batch: { name: string; type: string };
      coach: { user: { name: string } };
    }>;
  }>(PENDING_FEEDBACK_KEY);

  return {
    pendingLogs: data?.pendingClassLogs ?? [],
    isLoading,
    error,
  };
}

/** Call this after a student submits feedback to clear the cache immediately */
export function invalidatePendingFeedback() {
  return mutate(PENDING_FEEDBACK_KEY);
}
