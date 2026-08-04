"use client";

import { useState, useTransition } from "react";
import { MessageSquare, CheckCircle, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAdminTickets, replyToTicket, resolveTicket } from "@/actions/tickets/admin-actions";

type TicketData = {
  id: string;
  title: string;
  description: string;
  status: string;
  category: string;
  createdAt: Date;
  createdBy: { user: { name: string; email: string } };
  replies: { id: string; content: string; createdAt: Date; author: { name: string; role: string } }[];
};

export function AdminTicketsClient({ 
  initialTickets, 
  initialCursor 
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

  const activeTicket = tickets.find(t => t.id === activeTicketId);

  const fetchTickets = async (currentCursor?: string) => {
    setIsLoading(true);
    try {
      const { tickets: newTickets, nextCursor } = await getAdminTickets(currentCursor);
      if (currentCursor) {
        setTickets(prev => [...prev, ...newTickets as any]);
      } else {
        setTickets(newTickets as any);
      }
      setCursor(nextCursor ?? null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReply = () => {
    if (!activeTicketId || !replyContent.trim()) return;
    
    startTransition(async () => {
      const result = await replyToTicket(activeTicketId, replyContent);
      if (result.success) {
        setReplyContent("");
        // Optimistically reload list
        fetchTickets(); 
      }
    });
  };

  const handleResolve = (ticketId: string) => {
    startTransition(async () => {
      const result = await resolveTicket(ticketId);
      if (result.success) {
        setTickets(prev => prev.filter(t => t.id !== ticketId));
        if (activeTicketId === ticketId) {
          setActiveTicketId(null);
        }
      }
    });
  };

  return (
    <div className="flex h-[700px] border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Left Side: Ticket List */}
      <div className="w-1/3 border-r border-slate-100 flex flex-col bg-slate-50">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {tickets.map(ticket => (
            <div 
              key={ticket.id}
              onClick={() => setActiveTicketId(ticket.id)}
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${activeTicketId === ticket.id ? 'bg-brand-50 border-brand-200' : 'bg-white border-slate-200 hover:border-brand-300'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold tracking-wide text-brand-700 bg-brand-100 px-2 py-1 rounded-md">
                  {ticket.category.replace(/_/g, " ")}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  {new Date(ticket.createdAt).toLocaleDateString()}
                </span>
              </div>
              <h4 className="font-semibold text-sm text-slate-900 line-clamp-1">{ticket.title}</h4>
              <p className="text-xs text-slate-500 mt-1.5 font-medium line-clamp-1">From: {ticket.createdBy.user.name}</p>
            </div>
          ))}

          {tickets.length === 0 && !isLoading && (
            <div className="text-center text-slate-500 text-sm mt-10">
              No pending tickets! You're all caught up.
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

      {/* Right Side: Ticket Details */}
      <div className="w-2/3 flex flex-col">
        {activeTicket ? (
          <>
            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-white">
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-1.5">{activeTicket.title}</h3>
                <p className="text-sm text-slate-500">
                  Raised by <span className="font-medium text-slate-700">{activeTicket.createdBy.user.name}</span> ({activeTicket.createdBy.user.email})
                </p>
              </div>
              <Button 
                variant="secondary" 
                className="text-green-700 border-green-200 bg-green-50 hover:bg-green-100 hover:text-green-800"
                onClick={() => handleResolve(activeTicket.id)}
                disabled={isPending}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark as Resolved
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
              {/* Original Issue */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {activeTicket.description}
              </div>
              
              {/* Replies */}
              {activeTicket.replies.map(reply => (
                <div key={reply.id} className={`flex flex-col ${reply.author.role === 'ADMIN' ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-baseline gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-slate-700">{reply.author.name}</span>
                    <span className="text-[11px] text-slate-400 font-medium">{new Date(reply.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <div className={`p-4 rounded-xl text-sm leading-relaxed max-w-[85%] shadow-sm ${
                    reply.author.role === 'ADMIN' 
                      ? 'bg-brand-600 text-white rounded-tr-sm' 
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                  }`}>
                    {reply.content}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-5 border-t border-slate-200 bg-white">
              <div className="flex gap-3">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Type your reply to the student..."
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
  );
}
