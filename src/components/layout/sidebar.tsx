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
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-950 lg:flex sticky top-0 h-screen overflow-y-auto">
      <div className="flex h-20 items-center justify-center border-b border-slate-800 px-6 py-2">
        <Image src="/image.png" alt="Strategic Mind Chess" width={180} height={60} className="h-full w-auto object-contain" />
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:bg-slate-900 hover:text-white",
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
