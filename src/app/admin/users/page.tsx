import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CreateUserButton } from "@/components/admin/create-user-dialog";
import { UsersTable } from "@/components/admin/users-table";

export const metadata: Metadata = { title: "Coaches & Students · SMC CRM" };

const TABS = [
  { label: "All", value: "ALL" as const },
  { label: "Coaches", value: Role.TEACHER },
  { label: "Students", value: Role.STUDENT },
];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; page?: string }>;
}) {
  await requireRole([Role.ADMIN]);

  const { role, page } = await searchParams;
  const activeTab =
    role === Role.TEACHER || role === Role.STUDENT ? role : "ALL";

  const currentPage = Math.max(1, parseInt(page || "1", 10));
  const take = 20;
  const skip = (currentPage - 1) * take;

  const whereClause =
    activeTab === "ALL"
      ? { role: { in: [Role.TEACHER, Role.STUDENT] } }
      : { role: activeTab };

  const [usersData, totalUsers] = await Promise.all([
    prisma.user.findMany({
      where: whereClause,
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      take,
      skip,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        studentProfile: { select: { city: true, rating: true } },
        coachProfile: { select: { city: true } },
      },
    }),
    prisma.user.count({ where: whereClause }),
  ]);

  const users = usersData.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    isActive: u.isActive,
    city: u.studentProfile?.city || u.coachProfile?.city || null,
    rating: u.studentProfile?.rating ?? null,
  }));

  const totalPages = Math.ceil(totalUsers / take);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Coaches & Students
          </h1>
          <p className="text-sm text-slate-500">
            Create and manage coach and student accounts.
          </p>
        </div>
        <CreateUserButton />
      </div>

      <Card>
        <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 pt-3">
          {TABS.map((tab) => {
            const href =
              tab.value === "ALL"
                ? "/admin/users"
                : `/admin/users?role=${tab.value}`;
            const isActive = activeTab === tab.value;

            return (
              <Link
                key={tab.value}
                href={href}
                className={cn(
                  "rounded-t-lg border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap",
                  isActive
                    ? "border-brand-600 text-brand-700"
                    : "border-transparent text-slate-500 hover:text-slate-700",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
        <div className="p-0">
          <UsersTable 
            users={users} 
            currentPage={currentPage}
            totalPages={totalPages}
            searchParams={{ ...(role ? { role } : {}) }}
          />
        </div>
      </Card>
    </div>
  );
}
