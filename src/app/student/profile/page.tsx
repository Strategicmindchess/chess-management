import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function StudentProfilePage() {
  const user = await requireRole([Role.STUDENT]);

  const userWithProfile = await prisma.user.findUnique({
    where: { id: user.id },
    include: { studentProfile: { select: { chessComId: true, lichessId: true, rating: true, city: true } } },
  });

  const studentDetails = userWithProfile?.studentProfile;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          My Profile
        </h1>
      </div>

      {studentDetails ? (
        <Card>
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <p className="text-slate-500">City</p>
                <p className="font-medium text-slate-900">{studentDetails.city || "—"}</p>
              </div>
              <div>
                <p className="text-slate-500">Rating</p>
                <p className="font-medium text-slate-900">{studentDetails.rating ?? "—"}</p>
              </div>
              <div>
                <p className="text-slate-500">Chess.com</p>
                <p className="font-medium text-slate-900">{studentDetails.chessComId || "—"}</p>
              </div>
              <div>
                <p className="text-slate-500">Lichess</p>
                <p className="font-medium text-slate-900">{studentDetails.lichessId || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-6 text-sm text-slate-500">
            No profile details available.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
