import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { getStudentPassportData } from "@/services/passport/passport.service";
import { StudentProfileTabs } from "./student-profile-tabs";

export const dynamic = "force-dynamic";

export default async function StudentProfilePage() {
  const userBase = await requireRole([Role.STUDENT]);

  const userWithProfile = await prisma.user.findUniqueOrThrow({
    where: { id: userBase.id },
    include: { studentProfile: true },
  });

  if (!userWithProfile.studentProfile) {
    return <div>Student profile not found.</div>;
  }

  const passport = await getStudentPassportData(userWithProfile.studentProfile.id, {
    viewerRole: Role.STUDENT,
    viewerUserId: userBase.id,
  });

  if (!passport) {
    return <div>Failed to load passport.</div>;
  }

  return (
    <div className="space-y-6">
      <StudentProfileTabs
        passport={passport}
        userWithProfile={userWithProfile as any}
      />
    </div>
  );
}
