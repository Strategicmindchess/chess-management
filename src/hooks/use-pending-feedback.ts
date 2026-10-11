"use client";

import { useState, useEffect } from "react";
import useSWR, { mutate } from "swr";

export const PENDING_FEEDBACK_KEY = "/api/class-feedback/pending";
const SESSION_CHECKED_KEY = "smc_feedback_checked_session";

/**
 * Hook: usePendingFeedback
 *
 * Ensures the feedback check only runs ONCE per login session.
 * - On first load in the browser session, it calls /api/class-feedback/pending.
 * - If no feedback is pending (or once student submits feedback),
 *   it records a session flag in sessionStorage.
 * - For all subsequent page visits, tab switches, or navigations in this session,
 *   it skips the network call completely and returns empty.
 */
export function usePendingFeedback() {
  const [hasCheckedSession, setHasCheckedSession] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem(SESSION_CHECKED_KEY) === "true";
    }
    return false;
  });

  const { data, error, isLoading } = useSWR<{
    pendingClassLogs: Array<{
      id: string;
      classInstance: { date: string; startTime: string; endTime: string };
      batch: { name: string; type: string };
      coach: { user: { name: string } };
    }>;
  }>(hasCheckedSession ? null : PENDING_FEEDBACK_KEY, {
    revalidateOnFocus: false,     // Don't refetch on switching tabs
    revalidateIfStale: false,     // Don't refetch on component re-render
    revalidateOnReconnect: false, // Don't refetch on network reconnect
    dedupingInterval: 86400000,   // Cache for 24h
    onSuccess: (res) => {
      // If there is no feedback pending, mark session as done so it NEVER asks again
      if (res?.pendingClassLogs?.length === 0 && typeof window !== "undefined") {
        sessionStorage.setItem(SESSION_CHECKED_KEY, "true");
        setHasCheckedSession(true);
      }
    },
  });

  return {
    pendingLogs: hasCheckedSession ? [] : (data?.pendingClassLogs ?? []),
    isLoading: hasCheckedSession ? false : isLoading,
    error,
  };
}

/** Call this after a student submits feedback to mark the session as done immediately */
export function invalidatePendingFeedback() {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(SESSION_CHECKED_KEY, "true");
  }
  return mutate(PENDING_FEEDBACK_KEY, { pendingClassLogs: [] }, false);
}

