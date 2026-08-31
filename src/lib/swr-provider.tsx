"use client";

import { SWRConfig } from "swr";
import type { ReactNode } from "react";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Network response was not ok");
    return res.json();
  });

/**
 * Global SWR Provider
 *
 * Strategy: cache data indefinitely until the user manually refreshes the page.
 * - dedupingInterval: 86400000 (24h) — same key won't re-fetch within 24 hours
 * - revalidateOnFocus: false       — switching browser tabs won't trigger refetch
 * - revalidateOnReconnect: false   — reconnecting network won't trigger refetch
 * - shouldRetryOnError: false      — don't auto-retry on API errors
 *
 * To manually invalidate: call mutate('/api/your-endpoint') after a mutation.
 */
export function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        dedupingInterval: 86_400_000, // 24 hours — effectively "never re-fetch"
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        revalidateIfStale: false,
        shouldRetryOnError: false,
      }}
    >
      {children}
    </SWRConfig>
  );
}
