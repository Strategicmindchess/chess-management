"use client";

import { useState, useEffect, useTransition } from "react";
import { MessageSquare, CheckCircle, Send, X, Loader2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
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

export function AdminTicketsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
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
      setCursor(nextCursor);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchTickets();
    }
  }, [open]);

  const handleReply = () => {
    if (!activeTicketId || !replyContent.trim()) return;
    
    startTransition(async () => {
      const result = await replyToTicket(activeTicketId, replyContent);
      if (result.success) {
        setReplyContent("");
        // Optimistically update or refetch
        fetchTickets(); 
      }
    });
  };

  const handleResolve = (ticketId: string) => {
    startTransition(async () => {
      const result = await resolveTicket(ticketId);
      if (result.success) {
        // Remove from list
        setTickets(prev => prev.filter(t => t.id !== ticketId));
        if (activeTicketId === ticketId) {
          setActiveTicketId(null);
        }
      }
    });
  };

  return (
    <Dialog open={open} onClose={onClose} title="Support Tickets">
      <div className="flex h-[600px] -mx-6 -mb-6 border-t border-slate-100">
        
        {/* Left Side: Ticket List */}
        <div className="w-1/3 border-r border-slate-100 flex flex-col bg-slate-50 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {tickets.map(ticket => (
              <div 
                key={ticket.id}
                onClick={() => setActiveTicketId(ticket.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${activeTicketId === ticket.id ? 'bg-brand-50 border-brand-200' : 'bg-white border-slate-200 hover:border-brand-300'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-medium text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">{ticket.category.replace(/_/g, " ")}</span>
                  <span className="text-[10px] text-slate-400">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                </div>
                <h4 className="font-semibold text-sm text-slate-900 line-clamp-1">{ticket.title}</h4>
                <p className="text-xs text-slate-500 mt-1 line-clamp-1">{ticket.createdBy.user.name}</p>
              </div>
            ))}

            {tickets.length === 0 && !isLoading && (
              <div className="text-center text-slate-500 text-sm mt-10">No pending tickets.</div>
            )}

            {cursor && (
              <Button 
                variant="secondary" 
                className="w-full text-xs" 
                onClick={() => fetchTickets(cursor)}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Load more"}
              </Button>
            )}
          </div>
        </div>

        {/* Right Side: Ticket Details */}
        <div className="w-2/3 flex flex-col bg-white">
          {activeTicket ? (
            <>
              <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">{activeTicket.title}</h3>
                  <p className="text-xs text-slate-500">From: {activeTicket.createdBy.user.name} ({activeTicket.createdBy.user.email})</p>
                </div>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="text-green-600 border-green-200 hover:bg-green-50"
                  onClick={() => handleResolve(activeTicket.id)}
                  disabled={isPending}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Resolve
                </Button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap">
                  {activeTicket.description}
                </div>
                
                {activeTicket.replies.map(reply => (
                  <div key={reply.id} className={`flex flex-col ${reply.author.role === 'ADMIN' ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-xs font-medium text-slate-700">{reply.author.name}</span>
                      <span className="text-[10px] text-slate-400">{new Date(reply.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <div className={`p-3 rounded-lg text-sm max-w-[85%] ${reply.author.role === 'ADMIN' ? 'bg-brand-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'}`}>
                      {reply.content}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50">
                <div className="flex gap-2">
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Type your reply..."
                    className="flex-1 resize-none rounded-md border border-slate-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    rows={2}
                  />
                  <Button 
                    className="self-end" 
                    onClick={handleReply}
                    disabled={isPending || !replyContent.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <MessageSquare className="w-12 h-12 mb-2 opacity-20" />
              <p className="text-sm">Select a ticket to view and reply</p>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
