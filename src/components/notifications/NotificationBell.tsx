"use client";

import { useEffect, useRef, useState } from "react";
import { X, Check, CheckCheck, ExternalLink, Trash2 } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";

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
  LOW:    "border-l-slate-500",
  NORMAL: "border-l-blue-400",
  HIGH:   "border-l-amber-400",
  URGENT: "border-l-red-500",
};

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data, mutate, isLoading } = useSWR("/api/notifications", fetcher, {
    refreshInterval: 120000,      // poll every 2 minutes instead of 1
    revalidateOnFocus: false,     // don't refetch just because user switched tabs/pages
    revalidateOnReconnect: false, // don't refetch on network reconnect
    dedupingInterval: 60000,      // dedupe requests within 60s window
  });

  const notifications: Notification[] = data?.notifications ?? [];
  const unreadCount: number = data?.unreadCount ?? 0;

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
        notifications: prevData.notifications.map((n: Notification) =>
          n.id === id ? { ...n, isRead: true } : n
        ),
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
    mutate({ notifications: [], unreadCount: 0 }, false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* ── 3D Golden Bell Button ── */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className={`
          relative flex h-11 w-11 items-center justify-center rounded-xl
          bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600
          shadow-[0_4px_0_rgba(146,64,14,0.7),0_6px_16px_rgba(245,158,11,0.45)]
          border border-amber-300/40
          hover:from-amber-300 hover:via-amber-400 hover:to-amber-500
          hover:shadow-[0_2px_0_rgba(146,64,14,0.6),0_4px_12px_rgba(245,158,11,0.5)]
          hover:translate-y-[2px]
          active:translate-y-[4px] active:shadow-[0_0px_0_rgba(146,64,14,0.5)]
          transition-all duration-100
          ${unreadCount > 0 ? "animate-bell-ring" : ""}
        `}
      >
        {/* Bell SVG — custom 3D look */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          className="h-5 w-5 drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]"
        >
          <path
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 flex items-center justify-center rounded-full bg-red-500 border-2 border-[#11141c] text-white text-[10px] font-bold px-1 leading-none shadow-lg">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown (dark themed) ── */}
      {open && (
        <div className="fixed left-4 right-4 top-20 sm:left-auto sm:absolute sm:right-0 sm:top-full mt-3 sm:w-[390px] max-w-[390px] bg-[#1a1f2e] border border-slate-700/60 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/60 bg-[#141821]">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="text-amber-400">🔔</span>
              Notifications
              {unreadCount > 0 && (
                <span className="bg-amber-500/20 text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  {unreadCount} new
                </span>
              )}
            </h3>
            <div className="flex items-center gap-3">
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs text-slate-500 hover:text-red-400 font-medium flex items-center gap-1"
                  title="Clear all"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white ml-1 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[650px] overflow-y-auto divide-y divide-slate-800/60">
            {isLoading && notifications.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-sm">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center">
                <div className="text-4xl mb-3">🔔</div>
                <p className="text-sm text-slate-500">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => {
                const inner = (
                  <div className="flex-1 min-w-0 text-left">
                    <p className={`text-xs font-semibold leading-snug ${n.isRead ? "text-slate-300" : "text-white"}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed line-clamp-2">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-slate-600 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                );

                const itemClass = `flex gap-3 px-4 py-3.5 border-l-[3px] transition-colors ${PRIORITY_COLORS[n.priority] ?? "border-l-slate-700"} ${
                  n.isRead ? "bg-transparent" : "bg-brand-500/5"
                } hover:bg-slate-800/60 block w-full`;

                if (n.href) {
                  return (
                    <Link
                      key={n.id}
                      href={n.href}
                      onClick={() => { if (!n.isRead) markRead(n.id); setOpen(false); }}
                      className={itemClass}
                    >
                      {inner}
                    </Link>
                  );
                }

                return (
                  <button
                    key={n.id}
                    onClick={() => { if (!n.isRead) markRead(n.id); }}
                    className={itemClass}
                  >
                    {inner}
                  </button>
                );
              })
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-700/60 bg-[#141821]">
              <p className="text-[11px] text-slate-600 text-center">
                Showing last {notifications.length} notifications
              </p>
            </div>
          )}
        </div>
      )}

      {/* Bell ring keyframe */}
      <style>{`
        @keyframes bell-ring {
          0%, 100% { transform: rotate(0deg); }
          10% { transform: rotate(12deg); }
          20% { transform: rotate(-10deg); }
          30% { transform: rotate(8deg); }
          40% { transform: rotate(-6deg); }
          50% { transform: rotate(4deg); }
          60% { transform: rotate(0deg); }
        }
        .animate-bell-ring { animation: bell-ring 1.5s ease-in-out 1; }
      `}</style>
    </div>
  );
}
