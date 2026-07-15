"use client";

import { useState, useTransition } from "react";
import { updateProfile } from "@/actions/account/update-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Role } from "@/lib/enums";

export function ProfileForm({
  user,
}: {
  user: {
    name: string;
    email: string;
    phone: string | null;
    role: Role;
    studentProfile?: {
      city: string | null;
      parentName: string | null;
      parentPhone: string | null;
      chessComId: string | null;
      lichessId: string | null;
      rating: number | null;
    } | null;
    coachProfile?: {
      bio: string | null;
      experience: string | null;
      city: string | null;
    } | null;
  };
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      const result = await updateProfile(formData);
      if (result.error) {
        setError(result.error);
      } else if (result.success) {
        setSuccess(true);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-slate-900 border-b pb-2">Basic Information</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={user.email}
              disabled
              className="bg-slate-50 cursor-not-allowed"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={user.name}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={user.phone || ""}
            />
          </div>

          {(user.role === Role.STUDENT || user.role === Role.TEACHER) && (
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                name="city"
                defaultValue={user.studentProfile?.city || user.coachProfile?.city || ""}
              />
            </div>
          )}
        </div>
      </div>

      {user.role === Role.STUDENT && (
        <>
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-medium text-slate-900 border-b pb-2">Chess Details</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="chessComId">Chess.com ID</Label>
                <Input
                  id="chessComId"
                  name="chessComId"
                  defaultValue={user.studentProfile?.chessComId || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lichessId">Lichess ID</Label>
                <Input
                  id="lichessId"
                  name="lichessId"
                  defaultValue={user.studentProfile?.lichessId || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rating">Current Rating</Label>
                <Input
                  id="rating"
                  name="rating"
                  type="number"
                  defaultValue={user.studentProfile?.rating || ""}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-medium text-slate-900 border-b pb-2">Parent Details (Optional)</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="parentName">Parent Name</Label>
                <Input
                  id="parentName"
                  name="parentName"
                  defaultValue={user.studentProfile?.parentName || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parentPhone">Parent Phone</Label>
                <Input
                  id="parentPhone"
                  name="parentPhone"
                  type="tel"
                  defaultValue={user.studentProfile?.parentPhone || ""}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {user.role === Role.TEACHER && (
        <div className="space-y-4 pt-2">
          <h3 className="text-sm font-medium text-slate-900 border-b pb-2">Coach Details</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="experience">Experience Summary</Label>
              <Input
                id="experience"
                name="experience"
                defaultValue={user.coachProfile?.experience || ""}
                placeholder="e.g. 5 years coaching, FIDE Master"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <textarea
                id="bio"
                name="bio"
                rows={4}
                className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                defaultValue={user.coachProfile?.bio || ""}
                placeholder="Tell students about your coaching style..."
              />
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      {success && <p className="text-sm font-medium text-green-600">Profile updated successfully!</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
