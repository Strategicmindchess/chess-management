import { getAdminTickets } from "@/actions/tickets/admin-actions";
import { AdminTicketsClient } from "./tickets-client";

export const metadata = {
  title: "Support Tickets | Admin",
};

export default async function AdminTicketsPage() {
  const result = await getAdminTickets();
  
  if (!result.tickets) {
    return <div className="p-6 text-red-500">Failed to load tickets.</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Support Tickets</h1>
          <p className="text-sm text-slate-500 mt-1">Manage and resolve student issues</p>
        </div>
      </div>
      
      <AdminTicketsClient initialTickets={result.tickets as any} initialCursor={result.nextCursor} />
    </div>
  );
}
