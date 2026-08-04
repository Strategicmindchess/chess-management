import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/app/account/profile/profile-form";

export default async function StudentProfilePage() {
  const userBase = await requireRole([Role.STUDENT]);

  const userWithProfile = await prisma.user.findUniqueOrThrow({
    where: { id: userBase.id },
    include: { studentProfile: true },
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          My Profile
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your personal information, profile photo, and chess credentials.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
          <CardDescription>Update your personal details below. Your email address cannot be changed.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm user={userWithProfile as any} />
        </CardContent>
      </Card>
    </div>
  );
}
