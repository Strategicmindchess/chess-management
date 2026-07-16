"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserDetailDialog } from "@/components/admin/user-detail-dialog";
import type { UserRow } from "@/components/admin/users-table";
import { Pencil } from "lucide-react";

export function EditUserButton({ user }: { user: UserRow }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" onClick={() => setIsOpen(true)}>
        <Pencil className="w-4 h-4 mr-2" />
        Edit Profile
      </Button>

      {isOpen && (
        <UserDetailDialog
          user={user}
          open={isOpen}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
