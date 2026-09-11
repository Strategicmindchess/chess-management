"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/enums";
import { NAV_ITEMS } from "./nav-config";

export function Sidebar({
  role,
  roleLabel,
}: {
  role: Role;
  roleLabel: string;
}) {
  const pathname = usePathname();
  const navItems = NAV_ITEMS[role];

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 dark:border-slate-800/50 bg-slate-50 dark:bg-[#11141c]/40 dark:backdrop-blur-3xl lg:flex sticky top-0 h-screen overflow-y-auto z-20">
      <div className="flex h-20 items-center justify-center border-b border-slate-200 dark:border-slate-800/50 p-2">
        <Image src="/image.png" alt="Strategic Mind Chess" width={220} height={70} className="h-full w-auto object-contain dark:brightness-200" priority />
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || (item.href.split('/').length > 2 && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300 overflow-hidden",
                isActive
                  ? "bg-brand-500/20 text-brand-700 dark:text-brand-400 border border-brand-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                  : "text-slate-600 dark:text-slate-400 border border-transparent hover:border-slate-700/50 hover:bg-slate-200/30 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-white hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

