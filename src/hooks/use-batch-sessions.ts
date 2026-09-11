import useSWR, { mutate } from "swr";

export function batchSessionsKey(batchId: string | null) {
  return batchId ? `/api/batches/${batchId}/sessions` : null;
}

export type BatchSession = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  lectureName?: string | null;
  sessionNumber?: number | null;
};

/**
 * Hook: useBatchSessions
 *
 * Fetches the full session list for a specific batch. Only fires when
 * batchId is non-null (e.g., when the dialog is open).
 *
 * Cached per batchId key — re-opening the same dialog within the same browser
 * session returns cached data instantly with zero network calls.
 *
 * After any mutation (add/cancel/update), call:
 *   invalidateBatchSessions(batchId)
 */
export function useBatchSessions(batchId: string | null) {
  const { data, error, isLoading } = useSWR<{ sessions: BatchSession[] }>(
    batchSessionsKey(batchId)
  );

  return {
    sessions: data?.sessions ?? [],
    isLoading,
    error,
  };
}

export function invalidateBatchSessions(batchId: string) {
  return mutate(batchSessionsKey(batchId));
}

