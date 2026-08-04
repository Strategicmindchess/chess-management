import { getUserTickets } from "@/actions/tickets/user-actions";
import { StudentTicketsClient } from "./tickets-client";

export const metadata = {
  title: "My Tickets | SMC",
};

export default async function StudentTicketsPage() {
  const result = await getUserTickets();
  
  if (result.error) {
    return <div className="p-6 text-red-500">{result.error}</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Support Tickets</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your support requests and issues</p>
        </div>
      </div>
      
      <StudentTicketsClient initialTickets={result.tickets as any} />
    </div>
  );
}
