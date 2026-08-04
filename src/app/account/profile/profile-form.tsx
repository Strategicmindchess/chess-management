"use client";

import { useState, useTransition, useRef } from "react";
import { updateProfile } from "@/actions/account/update-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Role } from "@/lib/enums";
import Image from "next/image";

export function ProfileForm({
  user,
}: {
  user: {
    name: string;
    email: string;
    phone: string | null;
    role: Role;
    profilePictureUrl: string | null;
    studentProfile?: {
      city: string | null;
      parentName: string | null;
      parentPhone: string | null;
      chessComId: string | null;
      lichessId: string | null;
      chessComRating: number | null;
      lichessRating: number | null;
      fideId: string | null;
      fideRating: number | null;
      level: string | null;
    } | null;
    coachProfile?: {
      bio: string | null;
      experience: string | null;
      city: string | null;
      chessComId: string | null;
      lichessId: string | null;
      chessComRating: number | null;
      lichessRating: number | null;
    } | null;
  };
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [avatarUrl, setAvatarUrl] = useState(user.profilePictureUrl);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      
      setAvatarUrl(data.url);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

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
      
      <div className="flex items-center gap-6 pb-6 border-b border-slate-100">
        <div className="relative h-20 w-20 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="Avatar" fill className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-400">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
        </div>
        <div>
          <Label htmlFor="avatar-upload" className="cursor-pointer">
            <div className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
              {isUploading ? "Uploading..." : "Change Avatar"}
            </div>
            <input 
              id="avatar-upload" 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleAvatarChange}
              disabled={isUploading}
            />
          </Label>
          <p className="text-xs text-slate-500 mt-2">JPG, GIF or PNG. Max size of 2MB.</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-slate-900 border-b pb-2">Basic Information</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email">Email <span className="text-red-500 ml-0.5">*</span></Label>
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
            <Label htmlFor="name">Full Name <span className="text-red-500 ml-0.5">*</span></Label>
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
        <div className="space-y-4 pt-2">
          <h3 className="text-sm font-medium text-slate-900 border-b pb-2">Chess Details</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            
            <div className="space-y-2">
              <Label htmlFor="level">Student Level</Label>
              <Select id="level" name="level" defaultValue={user.studentProfile?.level || ""}>
                <option value="">Select level...</option>
                <option value="BEGINNER">Beginner</option>
                <option value="CORE_1">Core 1</option>
                <option value="CORE_2">Core 2</option>
                <option value="CORE_3">Core 3</option>
                <option value="CORE_4">Core 4</option>
                <option value="INTERMEDIATE_1">Intermediate 1</option>
                <option value="INTERMEDIATE_2">Intermediate 2</option>
                <option value="INTERMEDIATE_3">Intermediate 3</option>
                <option value="ADVANCE_1">Advance 1</option>
                <option value="ADVANCE_2">Advance 2</option>
                <option value="ELITE">Elite</option>
              </Select>
            </div>

            <div className="space-y-2">
              {/* Empty space to align FIDE IDs below */}
            </div>

            <div className="space-y-2">
              <Label htmlFor="chessComId">Chess.com ID</Label>
              <Input
                id="chessComId"
                name="chessComId"
                defaultValue={user.studentProfile?.chessComId || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chessComRating">Chess.com Rating</Label>
              <Input
                id="chessComRating"
                name="chessComRating"
                type="number"
                defaultValue={user.studentProfile?.chessComRating || ""}
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
              <Label htmlFor="lichessRating">Lichess Rating</Label>
              <Input
                id="lichessRating"
                name="lichessRating"
                type="number"
                defaultValue={user.studentProfile?.lichessRating || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fideId">FIDE ID</Label>
              <Input
                id="fideId"
                name="fideId"
                defaultValue={user.studentProfile?.fideId || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fideRating">FIDE Rating</Label>
              <Input
                id="fideRating"
                name="fideRating"
                type="number"
                defaultValue={user.studentProfile?.fideRating || ""}
              />
            </div>
          </div>
        </div>
      )}

      {user.role === Role.TEACHER && (
        <div className="space-y-4 pt-2">
          <h3 className="text-sm font-medium text-slate-900 border-b pb-2">Chess Details</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="chessComId">Chess.com ID</Label>
              <Input
                id="chessComId"
                name="chessComId"
                defaultValue={user.coachProfile?.chessComId || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chessComRating">Chess.com Rating</Label>
              <Input
                id="chessComRating"
                name="chessComRating"
                type="number"
                defaultValue={user.coachProfile?.chessComRating || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lichessId">Lichess ID</Label>
              <Input
                id="lichessId"
                name="lichessId"
                defaultValue={user.coachProfile?.lichessId || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lichessRating">Lichess Rating</Label>
              <Input
                id="lichessRating"
                name="lichessRating"
                type="number"
                defaultValue={user.coachProfile?.lichessRating || ""}
              />
            </div>
          </div>
        </div>
      )}

      {(user.role === Role.STUDENT) && (
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

      <Button type="submit" disabled={isPending || isUploading}>
        {isPending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
