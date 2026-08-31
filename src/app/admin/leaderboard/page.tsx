import { AdminLeaderboardClient } from "./admin-leaderboard-client";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export const dynamic = 'force-dynamic';

export default function AdminLeaderboardPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    }>
      <AdminLeaderboardClient />
    </Suspense>
  );
}
