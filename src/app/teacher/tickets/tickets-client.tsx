"use client";

import { useState, useTransition } from "react";
import { Plus, MessageSquare, Send, X } from "lucide-react";
import { createCoachTicket, replyToCoachTicket } from "@/actions/tickets/coach-actions";

type TicketStatus = "PENDING" | "RESOLVED";

const CATEGORIES = [
  "TECHNICAL_ISSUE", "PAYMENT_ISSUE", "RESCHEDULING",
  "BATCH_ISSUE", "COACH_ISSUE", "STUDENT_ISSUE", "OTHER",
] as const;

type TicketCategory = typeof CATEGORIES[number];

type TicketData = {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  category: TicketCategory;
  createdAt: string;
  replies: {
    id: string;
    content: string;
    createdAt: string;
    author: { name: string; role: string };
  }[];
};

const STATUS_STYLE: Record<TicketStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  RESOLVED: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

// ── New Ticket Modal ────────────────────────────────────────────────────────────
function NewTicketModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ title: "", category: "OTHER" as TicketCategory, description: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) { setError("All fields required"); return; }
    setLoading(true); setError(null);
    const result = await createCoachTicket(form.title, form.description, form.category);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    onCreated();
    onClose();
  }

  const inp = "border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 w-full";

  return (
    <div className="fixed inset-0 bg-gray-900/40 flex items-center justify-center z-50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-semibold text-xl text-slate-900">Raise a Support Ticket</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-700" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">Title</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={inp} placeholder="Brief summary of the issue" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">Category</label>
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value as TicketCategory }))} className={inp}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">Description</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className={`${inp} resize-none`} rows={5} placeholder="Describe your issue in detail..." />
          </div>
          {error && <p className="text-rose-600 text-xs">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg px-4 py-2.5 text-sm font-semibold">Cancel</button>
            <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
              {loading ? "Submitting…" : "Submit Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Client Component ───────────────────────────────────────────────────────
export function TeacherTicketsClient({ initialTickets }: { initialTickets: TicketData[] }) {
  const [tickets, setTickets] = useState(initialTickets);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isPending, startTransition] = useTransition();

  const active = tickets.find(t => t.id === activeId);

  function handleCreated() {
    window.location.reload();
  }

  function handleReply() {
    if (!activeId || !replyContent.trim()) return;
    startTransition(async () => {
      const result = await replyToCoachTicket(activeId, replyContent);
      if (result.success) {
        setReplyContent("");
        window.location.reload();
      }
    });
  }

  const pending = tickets.filter(t => t.status === "PENDING");
  const resolved = tickets.filter(t => t.status === "RESOLVED");

  function TicketItem({ ticket }: { ticket: TicketData }) {
    return (
      <div
        onClick={() => setActiveId(ticket.id)}
        className={`p-4 rounded-lg border cursor-pointer transition-colors ${
          activeId === ticket.id ? "bg-brand-50 border-brand-200" : "bg-white border-slate-200 hover:border-brand-300"
        }`}
      >
        <div className="flex justify-between items-start mb-1.5">
          <span className="text-xs font-semibold text-brand-700 bg-brand-100 px-2 py-0.5 rounded-md">
            {ticket.category.replace(/_/g, " ")}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${STATUS_STYLE[ticket.status]}`}>
            {ticket.status}
          </span>
        </div>
        <h4 className="font-semibold text-sm text-slate-900 line-clamp-1">{ticket.title}</h4>
        <p className="text-[11px] text-slate-400 mt-1">
          {new Date(ticket.createdAt).toLocaleDateString()} · {ticket.replies.length} replies
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end">
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" /> Raise Ticket
        </button>
      </div>

      <div className="flex h-[640px] border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
        {/* Left: Ticket List */}
        <div className="w-1/3 border-r border-slate-100 bg-slate-50 flex flex-col overflow-y-auto">
          <div className="p-4 space-y-3">
            {tickets.length === 0 ? (
              <div className="text-center text-slate-500 text-sm mt-10">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                <p>No tickets yet.</p>
                <p className="text-xs mt-1">Click "Raise Ticket" to get started.</p>
              </div>
            ) : (
              <>
                {pending.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Pending ({pending.length})</p>
                    {pending.map(t => <TicketItem key={t.id} ticket={t} />)}
                  </div>
                )}
                {resolved.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Resolved ({resolved.length})</p>
                    {resolved.map(t => <TicketItem key={t.id} ticket={t} />)}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right: Ticket Detail */}
        <div className="w-2/3 flex flex-col">
          {active ? (
            <>
              {/* Header */}
              <div className="p-6 border-b border-slate-100 bg-white">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{active.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {active.category.replace(/_/g, " ")} · {new Date(active.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${STATUS_STYLE[active.status]}`}>
                    {active.status}
                  </span>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/50">
                {/* Original description */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed shadow-sm">
                  {active.description}
                </div>

                {active.replies.map(reply => (
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

              {/* Reply input — only if pending */}
              {active.status === "PENDING" && (
                <div className="p-5 border-t border-slate-200 bg-white">
                  <div className="flex gap-3">
                    <textarea
                      value={replyContent}
                      onChange={e => setReplyContent(e.target.value)}
                      placeholder="Add a reply or additional details..."
                      className="flex-1 resize-none rounded-xl border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      rows={3}
                    />
                    <button
                      onClick={handleReply}
                      disabled={isPending || !replyContent.trim()}
                      className="self-end px-5 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" /> Reply
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
              <MessageSquare className="w-16 h-16 mb-4 text-slate-200" />
              <p className="text-base font-medium text-slate-500">Select a ticket to view</p>
              <p className="text-sm text-slate-400 mt-1">Or raise a new one using the button above.</p>
            </div>
          )}
        </div>
      </div>

      {showNew && (
        <NewTicketModal onClose={() => setShowNew(false)} onCreated={handleCreated} />
      )}
    </>
  );
}

