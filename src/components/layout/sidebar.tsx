"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/enums";
import { NAV_ITEMS } from "./nav-config";
import { X } from "lucide-react";
import { useEffect } from "react";

export function Sidebar({
  role,
  roleLabel,
  mobileOpen,
  onClose,
}: {
  role: Role;
  roleLabel: string;
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const navItems = NAV_ITEMS[role];

  // Close sidebar on route change (mobile)
  useEffect(() => {
    onClose?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const inner = (
    <aside className="flex w-72 shrink-0 flex-col h-full border-r border-slate-200 dark:border-slate-800/50 bg-white dark:bg-[#11141c] overflow-y-auto z-20">
      {/* Logo */}
      <div className="flex h-20 items-center justify-between border-b border-slate-200 dark:border-slate-800/50 px-5">
        <Image
          src="/image.png"
          alt="Strategic Mind Chess"
          width={160}
          height={44}
          className={cn(
            "h-11 w-auto object-contain",
            "mix-blend-multiply dark:mix-blend-lighten dark:invert"
          )}
          priority
        />
        {/* Close button — only shown on mobile when sidebar is open */}
        <button
          onClick={onClose}
          className="lg:hidden flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 transition-colors"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Role badge */}
      <div className="px-5 pt-4 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          {roleLabel}
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 pb-6">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href.split("/").length > 2 && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-brand-500/15 text-brand-600 dark:text-brand-400 border border-brand-500/40"
                  : "text-slate-600 dark:text-slate-400 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-brand-500" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar — always visible */}
      <div className="hidden lg:flex lg:w-72 lg:shrink-0 sticky top-0 h-screen">
        {inner}
      </div>

      {/* Mobile sidebar + overlay */}
      {mobileOpen && (
        <>
          {/* Backdrop overlay — click to close */}
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={onClose}
            aria-hidden="true"
          />
          {/* Slide-in panel */}
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden animate-in slide-in-from-left duration-300">
            {inner}
          </div>
        </>
      )}
    </>
  );
}
