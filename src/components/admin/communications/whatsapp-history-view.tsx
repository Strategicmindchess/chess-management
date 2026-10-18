'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  getWhatsAppMetricsAction, 
  getWhatsAppConversationsAction, 
  getWhatsAppMessagesForPhoneAction, 
  retryWhatsAppMessageAction,
  sendDirectTemplateMessageAction,
  WhatsAppMetrics,
  WhatsAppConversationSummary,
  WhatsAppMessageItem
} from '@/actions/whatsapp-history-actions';
import { 
  Search, 
  Check, 
  CheckCheck, 
  AlertCircle, 
  RefreshCw, 
  Send, 
  Phone, 
  User, 
  Calendar, 
  Clock, 
  MessageSquare, 
  Filter, 
  RotateCw,
  Sparkles,
  Layers,
  ChevronRight,
  TrendingUp,
  XCircle,
  ExternalLink
} from 'lucide-react';

export function WhatsAppHistoryView() {
  const [metrics, setMetrics] = useState<WhatsAppMetrics | null>(null);
  const [conversations, setConversations] = useState<WhatsAppConversationSummary[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessageItem[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DELIVERED' | 'READ' | 'FAILED'>('ALL');
  
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Quick Send State
  const [quickTemplate, setQuickTemplate] = useState('smc_class_reminder');
  const [quickSending, setQuickSending] = useState(false);

  // Load metrics & conversations on mount
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoadingMetrics(true);
    setLoadingConversations(true);
    try {
      const [m, c] = await Promise.all([
        getWhatsAppMetricsAction(),
        getWhatsAppConversationsAction(),
      ]);
      setMetrics(m);
      setConversations(c);
      if (c.length > 0 && !selectedPhone) {
        setSelectedPhone(c[0].recipientPhone);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMetrics(false);
      setLoadingConversations(false);
    }
  }

  // Load message thread whenever selectedPhone changes
  useEffect(() => {
    if (!selectedPhone) return;
    setLoadingMessages(true);
    getWhatsAppMessagesForPhoneAction(selectedPhone)
      .then((msgs) => setMessages(msgs))
      .catch(console.error)
      .finally(() => setLoadingMessages(false));
  }, [selectedPhone]);

  // Handle Retry
  async function handleRetry(logId: string) {
    setRetryingId(logId);
    setActionNotice(null);
    try {
      const res = await retryWhatsAppMessageAction(logId);
      if (res.success) {
        setActionNotice({ type: 'success', text: 'Message resent successfully via Meta Cloud API!' });
        // Refresh messages & metrics
        if (selectedPhone) {
          const msgs = await getWhatsAppMessagesForPhoneAction(selectedPhone);
          setMessages(msgs);
        }
        const m = await getWhatsAppMetricsAction();
        setMetrics(m);
      } else {
        setActionNotice({ type: 'error', text: res.error || 'Retry failed.' });
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err.message || 'Retry failed.' });
    } finally {
      setRetryingId(null);
    }
  }

  // Handle Quick Direct Send
  async function handleQuickSend() {
    if (!selectedPhone) return;
    const currentConv = conversations.find((c) => c.recipientPhone === selectedPhone);
    const recipientName = currentConv?.recipientName || 'Student';

    setQuickSending(true);
    setActionNotice(null);

    let params: Record<string, string> = {};
    if (quickTemplate === 'smc_class_reminder') {
      params = {
        student_name: recipientName,
        batch_name: 'Special Batch',
        class_date: new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        class_time: '05:00 PM',
        class_link: 'https://meet.google.com/smc-chess-class',
      };
    } else if (quickTemplate === 'smc_holiday') {
      params = {
        holiday_name: 'Upcoming Academy Break',
        start_date: 'Tomorrow',
      };
    } else if (quickTemplate === 'smc_tournament') {
      params = {
        tournament_name: 'SMC Sunday Arena',
        tournament_type: 'Rapid (10+0)',
        tournament_date: 'Sunday',
        tournament_time: '10:00 AM',
        registration_link: 'https://lichess.org/tournament/smc2026',
      };
    } else {
      params = {
        batch_name: 'Chess Batch',
        time: 'Today',
      };
    }

    try {
      const res = await sendDirectTemplateMessageAction(
        selectedPhone,
        recipientName,
        quickTemplate,
        params,
        `Template ${quickTemplate} sent directly from Admin Conversation tab.`
      );

      if (res.success) {
        setActionNotice({ type: 'success', text: `Sent ${quickTemplate} to +${selectedPhone}!` });
        const msgs = await getWhatsAppMessagesForPhoneAction(selectedPhone);
        setMessages(msgs);
        const m = await getWhatsAppMetricsAction();
        setMetrics(m);
      } else {
        setActionNotice({ type: 'error', text: res.error || 'Failed to send message.' });
      }
    } catch (e: any) {
      setActionNotice({ type: 'error', text: e.message || 'Send error' });
    } finally {
      setQuickSending(false);
    }
  }

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      !searchQuery ||
      c.recipientPhone.includes(searchQuery) ||
      c.recipientName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'ALL' || c.latestStatus.toUpperCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const selectedConversation = conversations.find((c) => c.recipientPhone === selectedPhone);

  return (
    <div className="space-y-6">
      {/* ── TOP SECTION: Aggregate Metrics & Template-wise Counts ──────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Sent */}
        <Card className="p-4 bg-slate-900/90 border-slate-800 backdrop-blur-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold tracking-wider text-slate-400">Total Sent</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {metrics?.totalSent ?? 0}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Across all batches & broadcasts</span>
        </Card>

        {/* Delivered */}
        <Card className="p-4 bg-slate-900/90 border-slate-800 backdrop-blur-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold tracking-wider text-slate-400">Delivered</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-emerald-400">{metrics?.deliveredCount ?? 0}</span>
            <span className="text-xs font-semibold text-emerald-500/80 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              {metrics?.deliveredPercent ?? 0}%
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Confirmed by Meta delivery receipts</span>
        </Card>

        {/* Read */}
        <Card className="p-4 bg-slate-900/90 border-slate-800 backdrop-blur-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold tracking-wider text-slate-400">Read</span>
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
              <CheckCheck className="w-4 h-4 text-sky-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-sky-400">{metrics?.readCount ?? 0}</span>
            <span className="text-xs font-semibold text-sky-500/80 bg-sky-500/10 px-1.5 py-0.5 rounded">
              {metrics?.readPercent ?? 0}%
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Blue ticks recorded via webhook</span>
        </Card>

        {/* Failed */}
        <Card className="p-4 bg-slate-900/90 border-slate-800 backdrop-blur-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold tracking-wider text-slate-400">Failed</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-rose-400">{metrics?.failedCount ?? 0}</span>
            <span className="text-xs font-semibold text-rose-500/80 bg-rose-500/10 px-1.5 py-0.5 rounded">
              {metrics?.failedPercent ?? 0}%
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Meta ecosystem or number drops</span>
        </Card>
      </div>

      {/* Template-wise Distribution Pills */}
      {metrics?.templateBreakdown && metrics.templateBreakdown.length > 0 && (
        <div className="p-3.5 bg-slate-900/50 rounded-xl border border-slate-800 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium flex items-center gap-1.5 mr-2">
            <Layers className="w-3.5 h-3.5 text-purple-400" /> Template Breakdown:
          </span>
          {metrics.templateBreakdown.map((t) => (
            <div
              key={t.templateName}
              className="bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-2"
            >
              <span className="font-mono text-purple-300 font-medium">{t.templateName}</span>
              <span className="bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded font-bold text-[10px]">
                {t.count}
              </span>
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            className="ml-auto text-xs text-slate-400 hover:text-white h-7 px-2"
          >
            <RotateCw className="w-3 h-3 mr-1" /> Refresh Counts
          </Button>
        </div>
      )}

      {/* Notification Toast */}
      {actionNotice && (
        <div
          className={`p-3 rounded-lg text-xs font-medium flex items-center justify-between border ${
            actionNotice.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
          }`}
        >
          <span>{actionNotice.text}</span>
          <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* ── TWO-COLUMN SPLIT: RECIPIENTS LIST (LEFT) & CHAT CONVERSATION (RIGHT) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px]">
        {/* LEFT COLUMN: Phone Numbers / Students List */}
        <div className="lg:col-span-4 flex flex-col bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl">
          {/* Search & Filter Header */}
          <div className="p-3.5 border-b border-slate-800 space-y-2.5 bg-slate-950/40">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input
                type="text"
                placeholder="Search phone or student..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs bg-slate-900/80 border-slate-800 text-white h-8"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 text-[11px]">
              {(['ALL', 'DELIVERED', 'READ', 'FAILED'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-2 py-0.5 rounded-md transition-all font-medium ${
                    statusFilter === filter
                      ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 max-h-[520px]">
            {loadingConversations ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading recipient threads...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No conversations matching &ldquo;{searchQuery}&rdquo;
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = selectedPhone === conv.recipientPhone;
                const status = conv.latestStatus.toUpperCase();

                return (
                  <div
                    key={conv.recipientPhone}
                    onClick={() => setSelectedPhone(conv.recipientPhone)}
                    className={`p-3.5 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-purple-950/40 border-l-4 border-l-purple-500'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-md">
                        {conv.recipientName.slice(0, 2).toUpperCase()}
                      </div>

                      {/* Recipient Details */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h5 className="font-semibold text-xs text-white truncate max-w-[140px]">
                            {conv.recipientName}
                          </h5>
                          <span className="text-[10px] text-purple-400 bg-purple-500/10 px-1 py-0.2 rounded shrink-0">
                            {conv.role}
                          </span>
                        </div>
                        <p className="font-mono text-[11px] text-slate-400 mt-0.5">
                          +{conv.recipientPhone}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate max-w-[170px] mt-0.5">
                          {conv.latestPreview}
                        </p>
                      </div>
                    </div>

                    {/* Status & Time */}
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-500 block">
                        {new Date(conv.latestMessageAt).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <div className="mt-1 flex items-center justify-end">
                        {status === 'READ' ? (
                          <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                        ) : status === 'DELIVERED' ? (
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                        ) : status === 'FAILED' ? (
                          <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                        ) : (
                          <Check className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: WhatsApp Conversation Chat View ("send msg") */}
        <div className="lg:col-span-8 flex flex-col bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow">
                    {selectedConversation.recipientName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white flex items-center gap-2">
                      {selectedConversation.recipientName}
                      <span className="text-xs font-mono font-normal text-emerald-400">
                        +{selectedConversation.recipientPhone}
                      </span>
                    </h4>
                    <span className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>Role: <strong className="text-slate-300">{selectedConversation.role}</strong></span>
                      <span>•</span>
                      <span>Total Notifications: <strong className="text-purple-400">{messages.length}</strong></span>
                    </span>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (selectedPhone) {
                      setLoadingMessages(true);
                      getWhatsAppMessagesForPhoneAction(selectedPhone)
                        .then(setMessages)
                        .finally(() => setLoadingMessages(false));
                    }
                  }}
                  className="text-xs border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-800 h-8"
                >
                  <RotateCw className="w-3 h-3 mr-1.5" /> Refresh Chat
                </Button>
              </div>

              {/* Chat Thread Messages Stream */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4 max-h-[460px] bg-[#0b141a]/95">
                {loadingMessages ? (
                  <div className="p-12 text-center text-xs text-slate-500">Loading conversation messages...</div>
                ) : messages.length === 0 ? (
                  <div className="p-12 text-center text-xs text-slate-500">
                    No messages logged yet for this recipient.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const statusUpper = msg.status.toUpperCase();
                    const isFailed = statusUpper === 'FAILED';
                    const isRead = statusUpper === 'READ';
                    const isDelivered = statusUpper === 'DELIVERED';

                    return (
                      <div key={msg.id} className="flex flex-col items-end">
                        {/* WhatsApp Message Bubble */}
                        <div
                          className={`max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-sm p-4 shadow-lg border text-xs leading-relaxed transition-all ${
                            isFailed
                              ? 'bg-rose-950/60 border-rose-500/40 text-rose-100 shadow-[0_0_15px_rgba(244,63,94,0.1)]'
                              : 'bg-[#202c33] border-[#2a3942] text-[#e9edef]'
                          }`}
                        >
                          {/* Template Header Badge */}
                          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2 mb-2.5">
                            <span className="font-mono text-[11px] font-bold text-purple-300 flex items-center gap-1.5">
                              <Sparkles className="w-3 h-3 text-purple-400" />
                              {msg.templateName}
                            </span>
                            <Badge
                              className={`text-[9px] px-1.5 py-0.2 ${
                                msg.templateCategory === 'UTILITY'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                              }`}
                            >
                              {msg.templateCategory || 'UTILITY'}
                            </Badge>
                          </div>

                          {/* Message Content Body */}
                          <p className="whitespace-pre-wrap font-sans text-xs">
                            {msg.previewText || `Template message sent: ${msg.templateName}`}
                          </p>

                          {/* Failure Explanation Banner */}
                          {isFailed && (
                            <div className="mt-3 p-2.5 rounded-lg bg-rose-900/40 border border-rose-500/30 text-[11px] text-rose-200">
                              <div className="font-semibold flex items-center gap-1 text-rose-300 mb-1">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Delivery Blocked by Meta:
                              </div>
                              <span>{msg.errorMessage || 'Ecosystem frequency cap or invalid test recipient.'}</span>
                            </div>
                          )}

                          {/* Footer with Timestamp, Status & RETRY BUTTON */}
                          <div className="flex items-center justify-between gap-4 mt-3 pt-2 border-t border-white/10 text-[10px] text-[#8696a0]">
                            <div className="flex items-center gap-2">
                              <span>
                                {new Date(msg.createdAt).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              {msg.retryCount > 0 && (
                                <span className="text-amber-400 font-mono">
                                  (Retried: {msg.retryCount}x)
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Status Indicator */}
                              <div className="flex items-center gap-1 font-semibold uppercase text-[10px]">
                                {isRead ? (
                                  <>
                                    <span className="text-sky-400">Read</span>
                                    <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                                  </>
                                ) : isDelivered ? (
                                  <>
                                    <span className="text-emerald-400">Delivered</span>
                                    <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                                  </>
                                ) : isFailed ? (
                                  <>
                                    <span className="text-rose-400">Failed</span>
                                    <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                                  </>
                                ) : (
                                  <>
                                    <span className="text-slate-400">Sent</span>
                                    <Check className="w-3.5 h-3.5 text-slate-400" />
                                  </>
                                )}
                              </div>

                              {/* RETRY BUTTON (Retry Send) */}
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={retryingId === msg.id}
                                onClick={() => handleRetry(msg.id)}
                                className={`h-6 px-2 text-[10px] font-semibold rounded-md border transition-all ${
                                  isFailed
                                    ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/40'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                                }`}
                              >
                                <RotateCw
                                  className={`w-2.5 h-2.5 mr-1 ${
                                    retryingId === msg.id ? 'animate-spin' : ''
                                  }`}
                                />
                                {retryingId === msg.id ? 'Retrying...' : 'Retry'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom Quick Send Bar ("send msg" chat trigger) */}
              <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-center gap-3">
                <div className="w-full sm:w-auto shrink-0 flex items-center gap-2">
                  <span className="text-xs text-slate-400 whitespace-nowrap">Template:</span>
                  <select
                    value={quickTemplate}
                    onChange={(e) => setQuickTemplate(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg text-xs text-purple-300 px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                  >
                    <option value="smc_class_reminder">smc_class_reminder (Class Reminder)</option>
                    <option value="smc_holiday">smc_holiday (Holiday Announcement)</option>
                    <option value="smc_tournament">smc_tournament (Weekly Tournament)</option>
                    <option value="smc_class_cancelled">smc_class_cancelled (Cancellation)</option>
                  </select>
                </div>

                <div className="w-full flex items-center gap-2">
                  <span className="text-xs text-slate-500 italic truncate flex-1">
                    Directly dispatch {quickTemplate} to +{selectedConversation.recipientPhone}
                  </span>
                  <Button
                    size="sm"
                    disabled={quickSending}
                    onClick={handleQuickSend}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs h-8 px-4 shrink-0 shadow-md"
                  >
                    <Send className="w-3 h-3 mr-1.5" />
                    {quickSending ? 'Sending...' : 'Send WhatsApp'}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-500">
              <MessageSquare className="w-12 h-12 text-slate-700 mb-3" />
              <p className="text-sm font-medium">Select a conversation thread from the left.</p>
              <p className="text-xs text-slate-600 mt-1">Review delivery status and trigger instant retries.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
