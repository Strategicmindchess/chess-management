"use client";

import { useState, useTransition, useRef } from "react";
import { Ban, CheckCircle2 } from "lucide-react";
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

export interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
  city?: string | null;
  rating?: number | null;
  monthlyFee?: number | null;
  perSessionFee?: number | null;
  groupSessionRate?: number | null;
  privateRate?: number | null;
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
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);

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
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
        <div className="overflow-x-auto">
          <Table>
            <TableHead>
              <tr>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Email</TableHeaderCell>
              <TableHeaderCell>Phone</TableHeaderCell>
              <TableHeaderCell>Role</TableHeaderCell>
              <TableHeaderCell>City</TableHeaderCell>
              <TableHeaderCell>Rating</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell className="text-right">Actions</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium text-slate-900">
                  {user.name}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.phone || "—"}</TableCell>
                <TableCell>
                  <Badge variant="brand">{ROLE_LABEL[user.role]}</Badge>
                </TableCell>
                <TableCell>{user.city || "—"}</TableCell>
                <TableCell>{user.rating ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? "success" : "neutral"}>
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setEditingUser(user)}
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
