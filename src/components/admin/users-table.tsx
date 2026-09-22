"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { UserDetailDialog } from "@/components/admin/user-detail-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { ROLE_LABEL } from "@/lib/constants";
import type { Role } from "@/lib/enums";
import { Loader2 } from "lucide-react";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
  city?: string | null;
  chessComRating?: number | null;
  lichessRating?: number | null;
  bio?: string | null;
  experience?: string | null;
}

export function UsersTable({
  users,
  currentPage,
  totalPages,
  searchParams,
}: {
  users: UserRow[];
  currentPage?: number;
  totalPages?: number;
  searchParams?: Record<string, string>;
}) {
  const router = useRouter();
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [navigatingId, setNavigatingId] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState(searchParams?.query || "");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  if (users.length === 0 && !searchParams?.query) {
    return (
      <EmptyState
        title="No users yet"
        description="Create a coach or student account to get started."
      />
    );
  }

  const handleRowClick = (user: UserRow) => {
    setNavigatingId(user.id);
    router.push(`/admin/users/${user.id}`);
  };

  return (
    <div className="flex flex-col min-h-[640px] justify-between">
      <div className="space-y-3 p-5">
        <div className="flex items-center gap-2 max-w-sm mb-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const query = formData.get("query") as string;
              const params = new URLSearchParams();
              if (searchParams?.role) params.set("role", searchParams.role);
              if (query) params.set("query", query);
              window.location.href = `/admin/users?${params.toString()}`;
            }}
            className="flex w-full gap-2"
          >
            <input
              type="text"
              name="query"
              placeholder="Search by name or email..."
              className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              value={searchValue}
              onChange={(e) => {
                setSearchValue(e.target.value);
                const form = e.currentTarget.form;
                if (form) {
                  if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                  searchTimeoutRef.current = setTimeout(() => {
                    form.requestSubmit();
                  }, 500);
                }
              }}
            />
            <Button type="submit" variant="secondary">Search</Button>
          </form>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-700/50">
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Email</TableHeaderCell>
                <TableHeaderCell>Phone</TableHeaderCell>
                <TableHeaderCell>Role</TableHeaderCell>
                <TableHeaderCell>City</TableHeaderCell>
                <TableHeaderCell>Chess.com</TableHeaderCell>
                <TableHeaderCell>Lichess</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell className="text-right">Actions</TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow
                  key={user.id}
                  className="cursor-pointer transition-colors group"
                  onClick={() => handleRowClick(user)}
                >
                  {/* Name with loading spinner */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {navigatingId === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-brand-400 shrink-0" />
                      ) : (
                        <span className="h-4 w-4 shrink-0" />
                      )}
                      <span className="font-semibold text-white group-hover:text-brand-400 transition-colors">
                        {user.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-300">{user.email}</TableCell>
                  <TableCell className="text-slate-400">{user.phone || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="brand">{ROLE_LABEL[user.role]}</Badge>
                  </TableCell>
                  <TableCell className="text-slate-300">{user.city || "—"}</TableCell>
                  <TableCell className="text-slate-300 font-mono text-xs">
                    {user.chessComRating ? (
                      <span className="text-emerald-400 font-semibold">{user.chessComRating}</span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-slate-300 font-mono text-xs">
                    {user.lichessRating ? (
                      <span className="text-blue-400 font-semibold">{user.lichessRating}</span>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "success" : "neutral"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingUser(user);
                      }}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      {currentPage && totalPages && totalPages > 1 && (
        <div className="mt-auto">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            basePath="/admin/users"
            searchParams={searchParams}
          />
        </div>
      )}

      <UserDetailDialog
        user={editingUser}
        open={!!editingUser}
        onClose={() => setEditingUser(null)}
      />
    </div>
  );
}
