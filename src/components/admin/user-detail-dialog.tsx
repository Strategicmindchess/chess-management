"use client";

import { useState, useTransition, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABEL } from "@/lib/constants";
import { Role } from "@/lib/enums";
import type { UserRow } from "@/components/admin/users-table";
import { updateAdminUserFields, deleteUser } from "@/actions/admin-actions";

export function UserDetailDialog({
  user,
  open,
  onClose,
}: {
  user: UserRow | null;
  open: boolean;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  if (!user) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.append("userId", user.id);
    formData.append("role", user.role);
    if (!formData.has("isActive")) {
      formData.append("isActive", "false");
    }
    
    startTransition(async () => {
      const result = await updateAdminUserFields(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        onClose();
      }
    });
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this user permanently? This action cannot be undone.")) {
      setError(null);
      startTransition(async () => {
        const result = await deleteUser(user.id);
        if (result?.error) {
          setError(result.error);
        } else {
          onClose();
        }
      });
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      title={`Update ${ROLE_LABEL[user.role]}`}
    >
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 py-4">
          <div className="space-y-4 mb-2 pb-4 border-b border-slate-100">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name <span className="text-red-500 ml-0.5">*</span></Label>
                <Input id="name" name="name" defaultValue={user.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email <span className="text-red-500 ml-0.5">*</span></Label>
                <Input id="email" name="email" type="email" defaultValue={user.email} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" defaultValue={user.phone ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" defaultValue={user.city ?? ""} />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Label htmlFor="isActive" className="text-slate-700">Account Status</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-500">Inactive</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" name="isActive" id="isActive" value="true" defaultChecked={user.isActive} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                </label>
                <span className="text-sm font-medium text-brand-700">Active</span>
              </div>
            </div>
          </div>

          {(user.role === Role.STUDENT || user.role === Role.TEACHER) && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="chessComRating">Chess.com Rating</Label>
                  <Input id="chessComRating" name="chessComRating" type="number" defaultValue={user.chessComRating ?? ""} placeholder="e.g. 1200" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lichessRating">Lichess Rating</Label>
                  <Input id="lichessRating" name="lichessRating" type="number" defaultValue={user.lichessRating ?? ""} placeholder="e.g. 1500" />
                </div>
              </div>
            </>
          )}

          {user.role === Role.TEACHER && (
            <>
              <div className="space-y-2">
                <Label htmlFor="experience">Experience</Label>
                <Input
                  id="experience"
                  name="experience"
                  defaultValue={user.experience ?? ""}
                  placeholder="e.g. FIDE Master, 5 years teaching"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <textarea
                  id="bio"
                  name="bio"
                  className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  defaultValue={user.bio ?? ""}
                  placeholder="A short bio about the coach..."
                />
              </div>
            </>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="mt-6 flex justify-between gap-3 border-t border-slate-100 pt-5">
          <Button
            type="button"
            variant="ghost"
            onClick={handleDelete}
            disabled={isPending}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            Delete User
          </Button>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} variant="primary">
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
