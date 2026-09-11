import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";
import { AdminRescheduleClient } from "./admin-reschedule-client";

export const dynamic = "force-dynamic";

export default async function AdminReschedulePage() {
  await requireRole([Role.ADMIN]);
  return <AdminRescheduleClient />;
}
