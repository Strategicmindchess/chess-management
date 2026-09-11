"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, X, Check, CheckCheck, ExternalLink, Trash2 } from "lucide-react";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  href?: string | null;
  createdAt: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "border-l-slate-300",
  NORMAL: "border-l-blue-400",
  HIGH: "border-l-amber-500",
  URGENT: "border-l-red-500",
};

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data, mutate, isLoading } = useSWR("/api/notifications", fetcher, {
    refreshInterval: 60000, // poll every 60s
    revalidateOnFocus: true,
  });

  const notifications: Notification[] = data?.notifications ?? [];
  const unreadCount: number = data?.unreadCount ?? 0;

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    mutate((prevData: any) => {
      if (!prevData) return prevData;
      return {
        notifications: prevData.notifications.map((n: Notification) => (n.id === id ? { ...n, isRead: true } : n)),
        unreadCount: Math.max(0, prevData.unreadCount - 1),
      };
    }, false);
  };

  const markAllRead = async () => {
    await fetch("/api/notifications/read-all", { method: "POST" });
    mutate((prevData: any) => {
      if (!prevData) return prevData;
      return {
        notifications: prevData.notifications.map((n: Notification) => ({ ...n, isRead: true })),
        unreadCount: 0,
      };
    }, false);
  };

  const clearAll = async () => {
    await fetch("/api/notifications/clear", { method: "DELETE" });
    mutate({
      notifications: [],
      unreadCount: 0,
    }, false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[380px] max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Bell className="w-4 h-4 text-slate-500" />
              Notifications
              {unreadCount > 0 && (
                <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </h3>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-brand-600 hover:text-brand-800 font-medium flex items-center gap-1"
                >
                  <CheckCheck className="w-3 h-3" />
                  Mark read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs text-slate-500 hover:text-red-600 font-medium flex items-center gap-1"
                  title="Clear all notifications"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 ml-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-50">
            {isLoading && notifications.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex gap-3 px-4 py-3 border-l-[3px] transition-colors ${PRIORITY_COLORS[n.priority] ?? "border-l-slate-200"} ${n.isRead ? "bg-white" : "bg-blue-50/40"}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold leading-snug ${n.isRead ? "text-slate-700" : "text-slate-900"}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {n.href && (
                      <Link
                        href={n.href}
                        onClick={() => { markRead(n.id); setOpen(false); }}
                        className="text-brand-600 hover:text-brand-800"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    )}
                    {!n.isRead && (
                      <button
                        onClick={() => markRead(n.id)}
                        className="text-slate-400 hover:text-emerald-600"
                        title="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50">
              <p className="text-[11px] text-slate-400 text-center">
                Showing last {notifications.length} notifications
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
