"use client";

import { useTransition, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, User, Moon, Sun, Menu } from "lucide-react";
import { logout } from "@/actions/auth/logout";
import type { Role } from "@/lib/enums";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useTheme } from "@/components/theme-provider";

export function Topbar({
  userName,
  userEmail,
  roleLabel,
  role,
  onMenuClick,
}: {
  userName: string;
  userEmail: string;
  roleLabel: string;
  role: Role;
  onMenuClick?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/50 bg-white/80 dark:bg-[#11141c]/70 px-4 backdrop-blur-xl sm:px-6">
      {/* Left — hamburger (mobile only) */}
      <div className="flex items-center gap-3 lg:hidden">
        <button
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Desktop spacer */}
      <div className="hidden lg:block" />

      {/* Right actions */}
      <div className="flex items-center gap-2 relative" ref={dropdownRef}>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-colors dark:text-slate-400 dark:hover:bg-[#242938] dark:hover:text-white"
          aria-label="Toggle Dark Mode"
        >
          {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </button>

        {/* Notification Bell */}
        <NotificationBell />

        {/* User info (desktop) */}
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-slate-900 dark:text-white">{userName}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{roleLabel}</p>
        </div>

        {/* Avatar / dropdown trigger */}
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 hover:bg-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-colors dark:bg-brand-900/40 dark:text-brand-300 dark:hover:bg-brand-900/60"
        >
          {initials}
        </button>

        {/* Dropdown menu */}
        {isDropdownOpen && (
          <div className="absolute right-0 top-11 mt-1 w-56 origin-top-right rounded-xl bg-white py-1 shadow-xl ring-1 ring-black/5 focus:outline-none z-50 dark:bg-[#1a1f2e] dark:ring-[#2a3040]">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-[#2a3040]">
              <p className="text-sm font-semibold text-slate-900 truncate dark:text-slate-100">{userName}</p>
              <p className="text-xs text-slate-500 truncate dark:text-slate-400">{userEmail}</p>
            </div>

            <Link
              href="/account/profile"
              onClick={() => setIsDropdownOpen(false)}
              className="flex w-full items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-[#242938] dark:hover:text-white"
            >
              <User className="mr-2 h-4 w-4" />
              Profile Management
            </Link>

            <Link
              href="/account/change-password"
              onClick={() => setIsDropdownOpen(false)}
              className="flex w-full items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 border-b border-slate-100 pb-3 mb-1 dark:text-slate-300 dark:hover:bg-[#242938] dark:hover:text-white dark:border-[#2a3040]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Change password
            </Link>

            <button
              disabled={isPending}
              onClick={() => {
                setIsDropdownOpen(false);
                startTransition(() => logout());
              }}
              className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 text-left dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
