import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";
import { EmployeesClient } from "@/components/admin/employees/employees-client";

export default async function AdminEmployeesPage() {
  await requireRole([Role.ADMIN]);

  const raw = await prisma.employeeProfile.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  // Serialize Date fields for the client component
  const employees = raw.map(e => ({
    ...e,
    joiningDate: e.joiningDate ? e.joiningDate.toISOString() : null,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }));

  return <EmployeesClient initialEmployees={employees} />;
}


