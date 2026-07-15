"use client";

import { useTransition, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, User } from "lucide-react";
import { logout } from "@/actions/auth/logout";
import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/enums";
import { NAV_ITEMS } from "./nav-config";

export function Topbar({
  userName,
  userEmail,
  roleLabel,
  role,
}: {
  userName: string;
  userEmail: string;
  roleLabel: string;
  role: Role;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const navItems = NAV_ITEMS[role];
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/80 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-3 lg:hidden">
        <span className="text-xl">♟</span>
        <select
          aria-label="Navigate"
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
          onChange={(event) => {
            if (event.target.value) router.push(event.target.value);
          }}
          defaultValue=""
        >
          <option value="" disabled>
            Navigate…
          </option>
          {navItems.map((item) => (
            <option key={item.href} value={item.href}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      <div className="hidden lg:block" />
      <div className="flex items-center gap-4 relative" ref={dropdownRef}>
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-slate-900">{userName}</p>
          <p className="text-xs text-slate-500">{roleLabel}</p>
        </div>
        
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-medium text-brand-700 hover:bg-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-colors"
        >
          {initials}
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 top-12 mt-2 w-56 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
            <div className="px-4 py-2 border-b border-slate-100">
              <p className="text-sm font-medium text-slate-900 truncate">{userName}</p>
              <p className="text-xs text-slate-500 truncate">{userEmail}</p>
            </div>
            
            <Link
              href="/account/profile"
              onClick={() => setIsDropdownOpen(false)}
              className="flex w-full items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900"
            >
              <User className="mr-2 h-4 w-4" />
              Profile Management
            </Link>
            
            <button
              disabled={isPending}
              onClick={() => {
                setIsDropdownOpen(false);
                startTransition(() => logout());
              }}
              className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 text-left"
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
