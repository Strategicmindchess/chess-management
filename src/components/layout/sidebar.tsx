"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/enums";
import { NAV_SECTIONS, NAV_ITEMS } from "./nav-config";
import { X, Loader2, ChevronDown } from "lucide-react";
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
  const sections = NAV_SECTIONS[role] || [{ items: NAV_ITEMS[role] }];
  const [navigatingHref, setNavigatingHref] = useState<string | null>(null);
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});

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

  // Auto-expand dropdown if any child matches current pathname
  useEffect(() => {
    sections.forEach((section) => {
      section.items.forEach((item) => {
        if (item.subItems) {
          const isChildActive = item.subItems.some(
            (sub) => pathname === sub.href || (sub.href !== "/admin" && pathname.startsWith(sub.href + "/"))
          );
          const isParentActive = pathname === item.href;
          if (isChildActive || isParentActive) {
            setOpenDropdowns((prev) => ({ ...prev, [item.label]: true }));
          }
        }
      });
    });
  }, [pathname, sections]);

  const toggleDropdown = (label: string) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const inner = (
    <aside className="flex w-72 shrink-0 flex-col h-full border-r border-slate-200 dark:border-slate-800/50 bg-white dark:bg-[#11141c] overflow-y-auto z-20">
      {/* Logo */}
      <div className="flex h-20 items-center justify-between border-b border-slate-200 dark:border-slate-800/50 px-5 shrink-0">
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
      <div className="px-5 pt-3 pb-1 shrink-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          {roleLabel}
        </p>
      </div>

      {/* Nav with Sections & Dropdowns */}
      <nav className="flex-1 px-3 pb-8 space-y-4">
        {sections.map((section, sIdx) => (
          <div key={section.title || sIdx} className="space-y-0.5">
            {/* Section Header */}
            {section.title && (
              <div className="pt-2 pb-1 px-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {section.title}
                </p>
              </div>
            )}

            {/* Section Items */}
            {section.items.map((item) => {
              const hasSubItems = Boolean(item.subItems && item.subItems.length > 0);
              const isDropdownOpen = Boolean(openDropdowns[item.label]);

              const isChildActive = hasSubItems && item.subItems!.some(
                (sub) => pathname === sub.href || (sub.href !== "/admin" && pathname.startsWith(sub.href + "/"))
              );
              const isDirectActive = pathname === item.href;
              const isItemActive = isDirectActive || isChildActive;
              const isNavigating = navigatingHref === item.href && pathname !== item.href;
              const Icon = item.icon;

              if (hasSubItems) {
                return (
                  <div key={item.label} className="space-y-0.5">
                    {/* Collapsible Dropdown Header */}
                    <button
                      type="button"
                      onClick={() => toggleDropdown(item.label)}
                      className={cn(
                        "group w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 text-left cursor-pointer",
                        isItemActive
                          ? "bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/30"
                          : "text-slate-600 dark:text-slate-400 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            isItemActive
                              ? "text-brand-500"
                              : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200",
                          isDropdownOpen && "rotate-180 text-brand-500"
                        )}
                      />
                    </button>

                    {/* Sub-items list */}
                    {isDropdownOpen && item.subItems && (
                      <div className="ml-5 pl-3 border-l border-slate-200 dark:border-slate-800/80 space-y-1 py-1 animate-in fade-in duration-200">
                        {item.subItems.map((sub) => {
                          const isSubActive =
                            pathname === sub.href ||
                            (sub.href !== "/admin" && pathname.startsWith(sub.href + "/"));
                          const isSubNavigating =
                            navigatingHref === sub.href && pathname !== sub.href;

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
                                "group flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-all",
                                isSubActive
                                  ? "bg-brand-500/15 text-brand-600 dark:text-brand-400 font-semibold border-l-2 border-brand-500 -ml-[13px] pl-[11px]"
                                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/40"
                              )}
                            >
                              <span className="truncate">{sub.label}</span>
                              <div className="flex items-center gap-1.5 shrink-0 ml-1">
                                {sub.badge && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    {sub.badge}
                                  </span>
                                )}
                                {isSubNavigating && (
                                  <Loader2 className="h-3 w-3 animate-spin text-brand-500" />
                                )}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // Standard Direct Link Item
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
                      isDirectActive
                        ? "bg-brand-500/15 text-brand-600 dark:text-brand-400 border border-brand-500/40"
                        : "text-slate-600 dark:text-slate-400 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white",
                      isNavigating && "opacity-80"
                    )}
                  >
                    {isNavigating ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-600 dark:text-brand-400" />
                    ) : (
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          isDirectActive
                            ? "text-brand-500"
                            : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                        )}
                      />
                    )}
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                        {item.badge}
                      </span>
                    )}
                    {isNavigating && (
                      <span className="text-[10px] uppercase font-bold tracking-wider text-brand-600 dark:text-brand-400 animate-pulse">
                        Loading
                      </span>
                    )}
                  </Link>
                </div>
              );
            })}
          </div>
        ))}
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
