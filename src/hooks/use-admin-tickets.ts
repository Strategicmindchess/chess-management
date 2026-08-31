import useSWR, { mutate } from "swr";

export const ADMIN_TICKETS_KEY = "/api/tickets/admin";

export type TicketData = {
  id: string;
  title: string;
  description: string;
  status: string;
  category: string;
  createdAt: Date;
  createdBy: { user: { name: string; email: string } };
  replies: { id: string; content: string; createdAt: Date; author: { name: string; role: string } }[];
};

/**
 * Hook: useAdminTickets
 *
 * Fetches all open tickets for the admin panel. Globally cached per session —
 * re-opening the dialog or switching pages will use cached data instantly.
 *
 * After a reply or resolve action, call invalidateAdminTickets() to refresh.
 */
export function useAdminTickets(enabled: boolean) {
  const { data, error, isLoading } = useSWR<{ tickets: TicketData[]; nextCursor: string | null }>(
    enabled ? ADMIN_TICKETS_KEY : null
  );

  return {
    tickets: data?.tickets ?? [],
    nextCursor: data?.nextCursor ?? null,
    isLoading,
    error,
  };
}

export function invalidateAdminTickets() {
  return mutate(ADMIN_TICKETS_KEY);
}
