import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";
import { getAdminChocolateData } from "@/actions/chocolate-actions";
import { AdminChocolateClient } from "./chocolate-client";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function AdminChocolatePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requireRole([Role.ADMIN]);
  
  const resolvedSearchParams = await searchParams;
  const month = resolvedSearchParams.month || format(new Date(), "yyyy-MM");
  const data = await getAdminChocolateData(month);

  return <AdminChocolateClient initialData={data} currentMonth={month} />;
}
