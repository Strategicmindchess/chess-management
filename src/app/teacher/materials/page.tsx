import type { Metadata } from "next";
import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";
import { MaterialsBrowser } from "@/components/materials/materials-browser";

export const metadata: Metadata = { title: "Class Materials · SMC CRM" };

export default async function TeacherMaterialsPage() {
  await requireRole([Role.TEACHER]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Class Materials</h1>
        <p className="text-sm text-slate-500">
          Browse and download class PGNs, assignments, and test links.
        </p>
      </div>

      <MaterialsBrowser />
    </div>
  );
}
