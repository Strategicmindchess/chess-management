"use client";

import { useState, useTransition } from "react";
import { MessageSquare, CheckCircle, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAdminTickets, replyToTicket, resolveTicket } from "@/actions/tickets/admin-actions";

type CreatorType = "all" | "student" | "coach";

type TicketData = {
  id: string;
  title: string;
  description: string;
  status: string;
  category: string;
  createdAt: Date;
  createdBy: { user: { name: string; email: string } } | null;
  coachCreatedBy: { user: { name: string; email: string } } | null;
  replies: { id: string; content: string; createdAt: Date; author: { name: string; role: string } }[];
};

function creatorLabel(ticket: TicketData) {
  if (ticket.coachCreatedBy) return { name: ticket.coachCreatedBy.user.name, tag: "Coach" };
  if (ticket.createdBy) return { name: ticket.createdBy.user.name, tag: "Student" };
  return { name: "Unknown", tag: "—" };
}

const CREATOR_COLORS: Record<string, string> = {
  Coach: "bg-blue-100 text-blue-700",
  Student: "bg-emerald-100 text-emerald-700",
};

export function AdminTicketsClient({
  initialTickets,
  initialCursor,
}: {
  initialTickets: TicketData[];
  initialCursor: string | null;
}) {
  const [tickets, setTickets] = useState<TicketData[]>(initialTickets);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isPending, startTransition] = useTransition();
  const [creatorFilter, setCreatorFilter] = useState<CreatorType>("all");

  const activeTicket = tickets.find(t => t.id === activeTicketId);

  const fetchTickets = async (currentCursor?: string, type: CreatorType = creatorFilter) => {
    setIsLoading(true);
    try {
      const { tickets: newTickets, nextCursor } = await getAdminTickets(currentCursor, type);
      if (currentCursor) {
        setTickets(prev => [...prev, ...newTickets as any]);
      } else {
        setTickets(newTickets as any);
        setActiveTicketId(null);
      }
      setCursor(nextCursor ?? null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const switchFilter = (type: CreatorType) => {
    setCreatorFilter(type);
    fetchTickets(undefined, type);
  };

  const handleReply = () => {
    if (!activeTicketId || !replyContent.trim()) return;
    startTransition(async () => {
      const result = await replyToTicket(activeTicketId, replyContent);
      if (result.success) {
        setReplyContent("");
        fetchTickets(undefined, creatorFilter);
      }
    });
  };

  const handleResolve = (ticketId: string) => {
    startTransition(async () => {
      const result = await resolveTicket(ticketId);
      if (result.success) {
        setTickets(prev => prev.filter(t => t.id !== ticketId));
        if (activeTicketId === ticketId) setActiveTicketId(null);
      }
    });
  };

  const TAB = (type: CreatorType, label: string) => (
    <button
      key={type}
      onClick={() => switchFilter(type)}
      className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
        creatorFilter === type
          ? "bg-slate-900 text-white border-slate-900"
          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2">
        {TAB("all", "All")}
        {TAB("student", "Students")}
        {TAB("coach", "Coaches")}
      </div>

      <div className="flex h-[680px] border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
        {/* Left: Ticket List */}
        <div className="w-1/3 border-r border-slate-100 flex flex-col bg-slate-50">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {tickets.map(ticket => {
              const creator = creatorLabel(ticket);
              return (
                <div
                  key={ticket.id}
                  onClick={() => setActiveTicketId(ticket.id)}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    activeTicketId === ticket.id
                      ? "bg-brand-50 border-brand-200"
                      : "bg-white border-slate-200 hover:border-brand-300"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold tracking-wide text-brand-700 bg-brand-100 px-2 py-1 rounded-md">
                      {ticket.category.replace(/_/g, " ")}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${CREATOR_COLORS[creator.tag] ?? "bg-slate-100 text-slate-600"}`}>
                      {creator.tag}
                    </span>
                  </div>
                  <h4 className="font-semibold text-sm text-slate-900 line-clamp-1">{ticket.title}</h4>
                  <p className="text-xs text-slate-500 mt-1.5 font-medium line-clamp-1">
                    From: {creator.name}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </p>
                </div>
              );
            })}

            {tickets.length === 0 && !isLoading && (
              <div className="text-center text-slate-500 text-sm mt-10">
                No pending tickets. All caught up! 🎉
              </div>
            )}

            {cursor && (
              <Button
                variant="secondary"
                className="w-full text-xs mt-4"
                onClick={() => fetchTickets(cursor)}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isLoading ? "Loading..." : "Load more tickets"}
              </Button>
            )}
          </div>
        </div>

        {/* Right: Ticket Details */}
        <div className="w-2/3 flex flex-col">
          {activeTicket ? (
            <>
              <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-white">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1.5">{activeTicket.title}</h3>
                  <p className="text-sm text-slate-500">
                    Raised by{" "}
                    <span className="font-medium text-slate-700">{creatorLabel(activeTicket).name}</span>
                    {" "}·{" "}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${CREATOR_COLORS[creatorLabel(activeTicket).tag] ?? "bg-slate-100"}`}>
                      {creatorLabel(activeTicket).tag}
                    </span>
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {activeTicket.category.replace(/_/g, " ")} · {new Date(activeTicket.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  className="text-green-700 border-green-200 bg-green-50 hover:bg-green-100 hover:text-green-800"
                  onClick={() => handleResolve(activeTicket.id)}
                  disabled={isPending}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark Resolved
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/50">
                {/* Original message */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {activeTicket.description}
                </div>

                {/* Replies */}
                {activeTicket.replies.map(reply => (
                  <div key={reply.id} className={`flex flex-col ${reply.author.role === "ADMIN" ? "items-end" : "items-start"}`}>
                    <div className="flex items-baseline gap-2 mb-1.5">
                      <span className="text-xs font-semibold text-slate-700">{reply.author.name}</span>
                      <span className="text-[11px] text-slate-400">{new Date(reply.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <div className={`p-4 rounded-xl text-sm leading-relaxed max-w-[85%] shadow-sm ${
                      reply.author.role === "ADMIN"
                        ? "bg-brand-600 text-white rounded-tr-sm"
                        : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm"
                    }`}>
                      {reply.content}
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply box */}
              <div className="p-5 border-t border-slate-200 bg-white">
                <div className="flex gap-3">
                  <textarea
                    value={replyContent}
                    onChange={e => setReplyContent(e.target.value)}
                    placeholder="Type your reply..."
                    className="flex-1 resize-none rounded-xl border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
                    rows={3}
                  />
                  <Button
                    className="self-end px-6"
                    onClick={handleReply}
                    disabled={isPending || !replyContent.trim()}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Reply
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
              <MessageSquare className="w-16 h-16 mb-4 text-slate-200" />
              <p className="text-base font-medium text-slate-500">Select a ticket to view and reply</p>
              <p className="text-sm text-slate-400 mt-1">Choose a ticket from the list on the left.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
