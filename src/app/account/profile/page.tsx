import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ROLE_LABEL } from "@/lib/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const userBase = await getCurrentUser();
  
  // Fetch the full profile details specifically for this page
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userBase.id },
    include: {
      studentProfile: true,
      coachProfile: true,
    }
  });
  return (
    <DashboardShell
      role={user.role}
      roleLabel={ROLE_LABEL[user.role]}
      userName={user.name}
      userEmail={user.email}
    >
      <div className="max-w-2xl py-6">
        <h1 className="text-2xl font-semibold text-slate-900 mb-6">Profile Management</h1>
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your personal details below. Your email address cannot be changed.</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm user={user} />
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
