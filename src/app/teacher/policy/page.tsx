import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";
import { PolicyContent } from "@/app/teacher/coach-policy-card";
import Link from "next/link";
import { ArrowLeft, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CoachPolicyPage() {
  await requireRole([Role.TEACHER]);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      {/* Back nav */}
      <div className="flex items-center gap-3">
        <Link
          href="/teacher"
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Compliance &amp; Penalty Policy</h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Review all academy rules carefully. These policies are enforced automatically via the portal.
        </p>
      </div>

      {/* Policy Content */}
      <div className="rounded-2xl bg-white dark:bg-[#1a1f2e] border border-slate-200/90 dark:border-slate-700/50 p-6 shadow-sm">
        <PolicyContent />
      </div>

      {/* Availability CTA */}
      <div className="rounded-2xl bg-white dark:bg-[#111723]/80 border border-blue-200/80 dark:border-blue-500/20 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <p className="text-slate-900 dark:text-white font-bold mb-1">Keep your availability up to date</p>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Your availability affects scheduling. Gaps or conflicts may result in penalties under Section 4.
          </p>
        </div>
        <Link
          href="/teacher/availability"
          className="shrink-0 flex items-center gap-2 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 dark:bg-blue-500/20 dark:hover:bg-blue-500/30 dark:border-blue-500/30 dark:text-blue-400 dark:hover:text-blue-300 px-4 py-2 text-sm font-semibold transition-colors shadow-xs"
        >
          <Calendar className="w-4 h-4" />
          Update Availability
        </Link>
      </div>
    </div>
  );
}
