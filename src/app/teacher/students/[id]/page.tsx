import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { getStudentPassportData } from "@/services/passport/passport.service";
import { StudentPassportView } from "@/components/passport/StudentPassportView";
import { ArrowLeft, ShieldAlert } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function TeacherStudentPassportPage({ params }: Props) {
  const user = await requireRole([Role.TEACHER]);
  const { id: studentProfileId } = await params;

  const coachProfile = await prisma.coachProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!coachProfile) {
    redirect("/teacher");
  }

  // Strict Permission Check: Coach can only view their own assigned students
  const isAssigned = await prisma.studentProfile.findFirst({
    where: {
      id: studentProfileId,
      OR: [
        { assignedCoachId: coachProfile.id },
        {
          enrollments: {
            some: {
              batch: { coachProfileId: coachProfile.id },
            },
          },
        },
      ],
    },
    select: { id: true },
  });

  if (!isAssigned) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white dark:bg-[#111723] rounded-3xl border border-rose-200 dark:border-rose-900 shadow-md text-center space-y-4">
        <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Access Restricted
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          You can only view the Chess Passport of students enrolled in your assigned batches.
        </p>
        <Link
          href="/teacher/batches"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-blue-400"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Batches
        </Link>
      </div>
    );
  }

  const passport = await getStudentPassportData(studentProfileId, {
    viewerRole: Role.TEACHER,
    viewerUserId: user.id,
  });

  if (!passport) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/teacher/batches"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Batches
        </Link>
        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800">
          Coach Review Mode
        </span>
      </div>

      <StudentPassportView
        passport={passport}
        isCoach={true}
      />
    </div>
  );
}
