"use client";

import { useState, useTransition } from "react";
import { Ban, CheckCircle2 } from "lucide-react";
import { setUserActiveState } from "@/actions/user-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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
}

export function UsersTable({ users }: { users: UserRow[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleToggle(userId: string, nextActive: boolean) {
    setError(null);
    setPendingId(userId);
    startTransition(async () => {
      const result = await setUserActiveState(userId, nextActive);
      if (!result.success) setError(result.error);
      setPendingId(null);
    });
  }

  if (users.length === 0) {
    return (
      <EmptyState
        title="No users yet"
        description="Create a coach or student account to get started."
      />
    );
  }

  return (
    <div className="space-y-3">
      {error && <p className="px-1 text-sm text-rose-600">{error}</p>}
      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Email</TableHeaderCell>
            <TableHeaderCell>Phone</TableHeaderCell>
            <TableHeaderCell>Role</TableHeaderCell>
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
              <TableCell>
                <Badge variant={user.isActive ? "success" : "neutral"}>
                  {user.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant={user.isActive ? "secondary" : "primary"}
                  size="sm"
                  disabled={isPending && pendingId === user.id}
                  onClick={() => handleToggle(user.id, !user.isActive)}
                >
                  {user.isActive ? (
                    <Ban className="h-3.5 w-3.5" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  {user.isActive ? "Deactivate" : "Activate"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
