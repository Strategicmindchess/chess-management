"use client";

import { useState, useTransition } from "react";
import { Plus, MessageSquare, Send, X, ArrowLeft } from "lucide-react";
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
  PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  RESOLVED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
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

  const inp = "border border-slate-700 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500 w-full bg-[#111723] text-slate-200 placeholder:text-slate-500";

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      {/* Bottom sheet on mobile, centered modal on desktop */}
      <div className="bg-[#1a1f2e] border border-slate-700/50 rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-lg shadow-xl">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-semibold text-xl text-white">Raise a Support Ticket</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-200" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400">Title</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={inp} placeholder="Brief summary of the issue" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400">Category</label>
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value as TicketCategory }))} className={inp}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400">Description</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className={`${inp} resize-none`} rows={5} placeholder="Describe your issue in detail..." />
          </div>
          {error && <p className="text-rose-400 text-xs">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg px-4 py-2.5 text-sm font-semibold">Cancel</button>
            <button type="submit" disabled={loading} className="bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
              {loading ? "Submitting…" : "Submit Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Ticket List Item ────────────────────────────────────────────────────────────
function TicketItem({ ticket, isActive, onClick }: { ticket: TicketData; isActive: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
        isActive
          ? "bg-brand-600/10 border-brand-500/40"
          : "bg-[#1a1f2e] border-slate-700/50 hover:border-brand-500/30"
      }`}
    >
      <div className="flex justify-between items-start mb-1.5">
        <span className="text-xs font-semibold text-brand-400 bg-brand-600/10 border border-brand-500/20 px-2 py-0.5 rounded-md truncate mr-2 max-w-[60%]">
          {ticket.category.replace(/_/g, " ")}
        </span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border shrink-0 ${STATUS_STYLE[ticket.status]}`}>
          {ticket.status}
        </span>
      </div>
      <h4 className="font-semibold text-sm text-slate-200 line-clamp-1">{ticket.title}</h4>
      <p className="text-[11px] text-slate-500 mt-1">
        {new Date(ticket.createdAt).toLocaleDateString()} · {ticket.replies.length} replies
      </p>
    </div>
  );
}

// ── Ticket Detail Panel ─────────────────────────────────────────────────────────
function TicketDetail({
  active,
  replyContent,
  setReplyContent,
  isPending,
  onReply,
  onBack,
}: {
  active: TicketData;
  replyContent: string;
  setReplyContent: (v: string) => void;
  isPending: boolean;
  onReply: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col h-full bg-[#1a1f2e]">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-slate-700/50 bg-[#1a1f2e]">
        <button
          onClick={onBack}
          className="lg:hidden flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-sm font-medium mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Back to tickets
        </button>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-white truncate">{active.title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {active.category.replace(/_/g, " ")} · {new Date(active.createdAt).toLocaleDateString()}
            </p>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border shrink-0 ${STATUS_STYLE[active.status]}`}>
            {active.status}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-[#111723]/50">
        {/* Original description */}
        <div className="bg-[#1a1f2e] p-4 sm:p-5 rounded-xl border border-slate-700/50 text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
          {active.description}
        </div>

        {active.replies.map(reply => (
          <div key={reply.id} className={`flex flex-col ${reply.author.role === "ADMIN" ? "items-end" : "items-start"}`}>
            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="text-xs font-semibold text-slate-300">{reply.author.name}</span>
              <span className="text-[11px] text-slate-500">{new Date(reply.createdAt).toLocaleTimeString()}</span>
            </div>
            <div className={`p-3.5 rounded-xl text-sm leading-relaxed max-w-[90%] sm:max-w-[85%] ${
              reply.author.role === "ADMIN"
                ? "bg-brand-600 text-white rounded-tr-sm"
                : "bg-[#1a1f2e] border border-slate-700/50 text-slate-300 rounded-tl-sm"
            }`}>
              {reply.content}
            </div>
          </div>
        ))}
      </div>

      {/* Reply input — only if pending */}
      {active.status === "PENDING" && (
        <div className="p-4 sm:p-5 border-t border-slate-700/50 bg-[#1a1f2e]">
          <div className="flex gap-2.5">
            <textarea
              value={replyContent}
              onChange={e => setReplyContent(e.target.value)}
              placeholder="Add a reply or additional details..."
              className="flex-1 resize-none rounded-xl border border-slate-700 bg-[#111723] text-slate-200 placeholder:text-slate-500 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              rows={3}
            />
            <button
              onClick={onReply}
              disabled={isPending || !replyContent.trim()}
              className="self-end px-4 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Reply</span>
            </button>
          </div>
        </div>
      )}
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
  // Mobile view: "list" | "detail"
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

  const active = tickets.find(t => t.id === activeId);
  const pending = tickets.filter(t => t.status === "PENDING");
  const resolved = tickets.filter(t => t.status === "RESOLVED");

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

  function selectTicket(id: string) {
    setActiveId(id);
    setMobileView("detail");
  }

  function goBack() {
    setMobileView("list");
    setActiveId(null);
  }

  return (
    <>
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Support Tickets</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Raise and track your support requests.</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Raise Ticket
        </button>
      </div>

      {/* ── MOBILE: single-panel view ─────────────────────────────────────── */}
      <div className="lg:hidden flex flex-col rounded-xl border border-slate-700/50 overflow-hidden bg-[#111723] shadow-sm min-h-[500px]">
        {mobileView === "list" || !active ? (
          /* Mobile Ticket List */
          <div className="flex flex-col h-full overflow-y-auto p-4 space-y-3">
            {tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 text-slate-500 py-20">
                <MessageSquare className="w-12 h-12 mb-3 text-slate-600" />
                <p className="text-slate-400 font-medium">No tickets yet.</p>
                <p className="text-xs mt-1 text-slate-500">Tap "Raise Ticket" to get started.</p>
              </div>
            ) : (
              <>
                {pending.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Pending ({pending.length})</p>
                    {pending.map(t => (
                      <TicketItem key={t.id} ticket={t} isActive={activeId === t.id} onClick={() => selectTicket(t.id)} />
                    ))}
                  </div>
                )}
                {resolved.length > 0 && (
                  <div className="space-y-2 mt-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Resolved ({resolved.length})</p>
                    {resolved.map(t => (
                      <TicketItem key={t.id} ticket={t} isActive={activeId === t.id} onClick={() => selectTicket(t.id)} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* Mobile Ticket Detail */
          active && (
            <TicketDetail
              active={active}
              replyContent={replyContent}
              setReplyContent={setReplyContent}
              isPending={isPending}
              onReply={handleReply}
              onBack={goBack}
            />
          )
        )}
      </div>

      {/* ── DESKTOP: 2-panel split view ───────────────────────────────────── */}
      <div className="hidden lg:flex h-[640px] border border-slate-700/50 rounded-xl overflow-hidden bg-[#111723] shadow-sm">
        {/* Left: Ticket List */}
        <div className="w-80 shrink-0 border-r border-slate-700/50 bg-[#111723] flex flex-col overflow-y-auto">
          <div className="p-4 space-y-3">
            {tickets.length === 0 ? (
              <div className="text-center text-slate-500 text-sm mt-10">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 text-slate-600" />
                <p className="text-slate-400">No tickets yet.</p>
                <p className="text-xs mt-1 text-slate-500">Click "Raise Ticket" to get started.</p>
              </div>
            ) : (
              <>
                {pending.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Pending ({pending.length})</p>
                    {pending.map(t => (
                      <TicketItem key={t.id} ticket={t} isActive={activeId === t.id} onClick={() => selectTicket(t.id)} />
                    ))}
                  </div>
                )}
                {resolved.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Resolved ({resolved.length})</p>
                    {resolved.map(t => (
                      <TicketItem key={t.id} ticket={t} isActive={activeId === t.id} onClick={() => selectTicket(t.id)} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right: Ticket Detail */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#1a1f2e]">
          {active ? (
            <TicketDetail
              active={active}
              replyContent={replyContent}
              setReplyContent={setReplyContent}
              isPending={isPending}
              onReply={handleReply}
              onBack={goBack}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-[#111723]/50">
              <MessageSquare className="w-16 h-16 mb-4 text-slate-700" />
              <p className="text-base font-medium text-slate-400">Select a ticket to view</p>
              <p className="text-sm text-slate-500 mt-1">Or raise a new one using the button above.</p>
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
