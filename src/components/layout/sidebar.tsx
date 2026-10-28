"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/enums";
import { NAV_ITEMS } from "./nav-config";
import { X, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

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
  const [navigatingHref, setNavigatingHref] = useState<string | null>(null);

  // Close sidebar on route change & clear pending link
  useEffect(() => {
    setNavigatingHref(null);
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
          const isItemActive =
            pathname === item.href ||
            (item.href.split("/").length > 2 && pathname.startsWith(item.href));
          const isNavigating = navigatingHref === item.href && pathname !== item.href;
          const Icon = item.icon;

          return (
            <div key={item.href} className="space-y-0.5">
              <Link
                href={item.href}
                onClick={() => {
                  if (pathname !== item.href) {
                    setNavigatingHref(item.href);
                  }
                  onClose?.();
                }}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                  isItemActive && (!item.subItems || pathname === item.href)
                    ? "bg-brand-500/15 text-brand-600 dark:text-brand-400 border border-brand-500/40"
                    : "text-slate-600 dark:text-slate-400 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white",
                  isNavigating && "opacity-80"
                )}
              >
                {isNavigating ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-600 dark:text-brand-400" />
                ) : (
                  <Icon className={cn("h-4 w-4 shrink-0", isItemActive ? "text-brand-500" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300")} />
                )}
                <span className="flex-1">{item.label}</span>
                {isNavigating && (
                  <span className="text-[10px] uppercase font-bold tracking-wider text-brand-600 dark:text-brand-400 animate-pulse">
                    Loading
                  </span>
                )}
              </Link>
              {item.subItems && (isItemActive || pathname.startsWith(item.href)) && (
                <div className="ml-6 pl-2.5 border-l border-slate-200 dark:border-slate-800 space-y-1 py-1">
                  {item.subItems.map((sub) => {
                    const isSubActive = pathname === sub.href;
                    const isSubNavigating = navigatingHref === sub.href && pathname !== sub.href;
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={() => {
                          if (pathname !== sub.href) {
                            setNavigatingHref(sub.href);
                          }
                          onClose?.();
                        }}
                        className={cn(
                          "flex items-center justify-between rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                          isSubActive
                            ? "bg-brand-500/20 text-brand-400 font-semibold border-l-2 border-brand-500 -ml-[11px] pl-[9px]"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/40"
                        )}
                      >
                        <span>{sub.label}</span>
                        {isSubNavigating && (
                          <Loader2 className="h-3 w-3 animate-spin text-brand-500" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
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
