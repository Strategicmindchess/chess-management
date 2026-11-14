import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { getStudentPassportData } from "@/services/passport/passport.service";
import { StudentPassportView } from "@/components/passport/StudentPassportView";
import { AdminCertificateManager } from "@/components/passport/AdminCertificateManager";
import { ArrowLeft, Shield } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function AdminStudentPassportPage({ params }: Props) {
  await requireRole([Role.ADMIN]);
  const { id: studentProfileId } = await params;

  const passport = await getStudentPassportData(studentProfileId, {
    viewerRole: Role.ADMIN,
  });

  if (!passport) {
    notFound();
  }

  const student = await prisma.studentProfile.findUnique({
    where: { id: studentProfileId },
    select: { userId: true },
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      <div className="flex items-center justify-between">
        <Link
          href={student?.userId ? `/admin/users/${student.userId}` : "/admin/users"}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to User Profile
        </Link>
        <span className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-3 py-1 rounded-full border border-amber-300 dark:border-amber-800 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" /> Super Admin Oversight
        </span>
      </div>

      {/* Main Student Passport */}
      <StudentPassportView
        passport={passport}
        isAdmin={true}
      />

      {/* Admin Certificate & Credential Management Section */}
      <div className="pt-4">
        <AdminCertificateManager
          studentProfileId={passport.id}
          studentName={passport.name}
          initialCertificates={passport.certificates}
        />
      </div>
    </div>
  );
}
