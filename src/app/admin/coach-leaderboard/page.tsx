import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";
import { AdminCoachLeaderboardClient } from "./admin-coach-leaderboard-client";

export const dynamic = "force-dynamic";

export default async function AdminCoachLeaderboardPage() {
  await requireRole([Role.ADMIN]);
  return <AdminCoachLeaderboardClient />;
}
