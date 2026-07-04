"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, LogOut } from "lucide-react";
import { logout } from "@/actions/auth/logout";
import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/enums";
import { NAV_ITEMS } from "./nav-config";

export function Topbar({
  userName,
  roleLabel,
  role,
}: {
  userName: string;
  roleLabel: string;
  role: Role;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const navItems = NAV_ITEMS[role];

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
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-slate-900">{userName}</p>
          <p className="text-xs text-slate-500">{roleLabel}</p>
        </div>
        <Link href="/account/change-password" title="Change password">
          <Button type="button" variant="ghost" size="sm">
            <KeyRound className="h-4 w-4" />
            <span className="hidden sm:inline">Password</span>
          </Button>
        </Link>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isPending}
          onClick={() => startTransition(() => logout())}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </header>
  );
}
