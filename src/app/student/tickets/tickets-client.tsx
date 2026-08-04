"use client";

import { useState, useTransition } from "react";
import { Plus, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createTicket, replyToOwnTicket } from "@/actions/tickets/user-actions";
import { TicketCategory, TicketStatus } from "@/lib/enums";

type TicketData = {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  category: TicketCategory;
  createdAt: Date;
  replies: { id: string; content: string; createdAt: Date; author: { name: string; role: string } }[];
};

export function StudentTicketsClient({ initialTickets }: { initialTickets: TicketData[] }) {
  const [tickets, setTickets] = useState(initialTickets);
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const activeTicket = tickets.find(t => t.id === activeTicketId);

  const handleCreateTicket = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const category = formData.get("category") as TicketCategory;
    const description = formData.get("description") as string;
    
    startTransition(async () => {
      const result = await createTicket(title, description, category);
      if (result.error) {
        setError(result.error);
      } else {
        setIsNewTicketOpen(false);
        // Page reload to fetch new tickets easily
        window.location.reload();
      }
    });
  };

  const handleReply = () => {
    if (!activeTicketId || !replyContent.trim()) return;
    
    startTransition(async () => {
      const result = await replyToOwnTicket(activeTicketId, replyContent);
      if (result.success) {
        setReplyContent("");
        window.location.reload();
      }
    });
  };

  return (
    <div className="flex h-[600px] border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
      
      {/* Left List */}
      <div className="w-1/3 border-r border-slate-100 flex flex-col bg-slate-50">
        <div className="p-4 border-b border-slate-100">
          <Button onClick={() => setIsNewTicketOpen(true)} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Raise Ticket
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {tickets.length === 0 ? (
            <div className="text-center text-sm text-slate-500 mt-4">You have no tickets.</div>
          ) : (
            tickets.map(ticket => (
              <div 
                key={ticket.id}
                onClick={() => setActiveTicketId(ticket.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${activeTicketId === ticket.id ? 'bg-brand-50 border-brand-200' : 'bg-white border-slate-200 hover:border-brand-300'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-medium text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">
                    {ticket.category.replace(/_/g, " ")}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${ticket.status === 'RESOLVED' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {ticket.status}
                  </span>
                </div>
                <h4 className="font-semibold text-sm text-slate-900 line-clamp-1">{ticket.title}</h4>
                <p className="text-xs text-slate-400 mt-1">{new Date(ticket.createdAt).toLocaleDateString()}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Content */}
      <div className="w-2/3 flex flex-col">
        {activeTicket ? (
          <>
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900 mb-1">{activeTicket.title}</h3>
              <p className="text-xs text-slate-500">Raised on {new Date(activeTicket.createdAt).toLocaleString()}</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap">
                {activeTicket.description}
              </div>
              
              {activeTicket.replies.map(reply => (
                <div key={reply.id} className={`flex flex-col ${reply.author.role === 'STUDENT' ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-xs font-medium text-slate-700">{reply.author.name}</span>
                    <span className="text-[10px] text-slate-400">{new Date(reply.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <div className={`p-3 rounded-lg text-sm max-w-[85%] ${reply.author.role === 'STUDENT' ? 'bg-brand-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'}`}>
                    {reply.content}
                  </div>
                </div>
              ))}
            </div>

            {activeTicket.status === 'PENDING' ? (
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
            ) : (
              <div className="p-4 border-t border-slate-100 bg-slate-50 text-center text-sm text-slate-500">
                This ticket has been resolved and is closed to new replies.
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
            <MessageSquare className="w-12 h-12 mb-2 opacity-20" />
            <p className="text-sm">Select a ticket to view details</p>
          </div>
        )}
      </div>

      <Dialog open={isNewTicketOpen} onClose={() => setIsNewTicketOpen(false)} title="Raise New Ticket">
        <form onSubmit={handleCreateTicket} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Subject</Label>
            <Input id="title" name="title" required placeholder="Brief description of the issue" />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select id="category" name="category" required>
              <option value="TECHNICAL_ISSUE">Technical Issue</option>
              <option value="PAYMENT_ISSUE">Payment Issue</option>
              <option value="RESCHEDULING">Rescheduling</option>
              <option value="BATCH_ISSUE">Batch Issue</option>
              <option value="COACH_ISSUE">Coach Issue</option>
              <option value="STUDENT_ISSUE">Student Issue</option>
              <option value="OTHER">Other</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Details</Label>
            <textarea
              id="description"
              name="description"
              required
              rows={5}
              className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              placeholder="Please provide as much detail as possible..."
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsNewTicketOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Submitting..." : "Submit Ticket"}</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
