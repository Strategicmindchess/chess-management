import { getCoachTickets } from "@/actions/tickets/coach-actions";
import { TeacherTicketsClient } from "./tickets-client";
import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";

export const metadata = { title: "Support Tickets | Coach" };

export default async function TeacherTicketsPage() {
  await requireRole([Role.TEACHER]);
  const result = await getCoachTickets();

  if ("error" in result) {
    return <div className="p-6 text-red-500">{result.error}</div>;
  }

  // Serialize dates for client
  const tickets = (result.tickets ?? []).map(t => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    replies: t.replies.map(r => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Support Tickets</h1>
        <p className="text-sm text-slate-500">Raise and track your support requests.</p>
      </div>
      <TeacherTicketsClient initialTickets={tickets} />
    </div>
  );
}
