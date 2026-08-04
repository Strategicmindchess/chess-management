import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";
import { ROLE_LABEL } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EditUserButton } from "./edit-user-button";
import { format } from "date-fns";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  await requireRole([Role.ADMIN]);

  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      studentProfile: {
        include: {
          enrollments: {
            include: { batch: { include: { coach: { include: { user: true } } } } }
          },
          attendanceRecords: {
            include: { classLog: { include: { batch: true } } },
            orderBy: { classLog: { date: "desc" } },
          }
        }
      },
      coachProfile: {
        include: {
          batches: true,
          classLogs: {
            orderBy: { date: "desc" }
          }
        }
      }
    }
  });

  if (!user) notFound();

  // Prepare the UserRow data for the Edit component
  const userRow = {
    ...user,
    city: user.studentProfile?.city || user.coachProfile?.city || null,
    chessComId: user.studentProfile?.chessComId || user.coachProfile?.chessComId || null,
    lichessId: user.studentProfile?.lichessId || user.coachProfile?.lichessId || null,
    parentName: user.studentProfile?.parentName || null,
    parentPhone: user.studentProfile?.parentPhone || null,
    chessComRating: user.studentProfile?.chessComRating || user.coachProfile?.chessComRating || null,
    lichessRating: user.studentProfile?.lichessRating || user.coachProfile?.lichessRating || null,
    bio: user.coachProfile?.bio || null,
    experience: user.coachProfile?.experience || null,
  };

  const isStudent = user.role === Role.STUDENT && user.studentProfile;
  const isCoach = user.role === Role.TEACHER && user.coachProfile;

  // Compute Student Attendance Stats
  let totalClasses = 0;
  let present = 0;
  let absent = 0;
  if (isStudent) {
    totalClasses = user.studentProfile!.attendanceRecords.length;
    present = user.studentProfile!.attendanceRecords.filter(a => a.status === "PRESENT").length;
    absent = totalClasses - present;
  }

  // Compute Coach Stats
  let coachTotalClasses = 0;
  let coachPayoutTotal = 0;
  if (isCoach) {
    coachTotalClasses = user.coachProfile!.classLogs.length;
    coachPayoutTotal = user.coachProfile!.classLogs.reduce((acc, log) => acc + log.payoutAmount, 0);
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-900">{user.name}</h1>
            <Badge variant="brand">{ROLE_LABEL[user.role]}</Badge>
            <Badge variant={user.isActive ? "success" : "neutral"}>
              {user.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div className="text-sm text-slate-500 space-x-4">
            <span>{user.email}</span>
            {user.phone && <span>{user.phone}</span>}
          </div>
        </div>
        <EditUserButton user={userRow} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 py-1 border-b border-slate-100">
              <span className="text-slate-500">Name</span>
              <span className="font-medium">{user.name}</span>
            </div>
            {isStudent && (
              <>
                <div className="grid grid-cols-2 py-1 border-b border-slate-100">
                  <span className="text-slate-500">Parent Name</span>
                  <span className="font-medium">{userRow.parentName || "—"}</span>
                </div>
                <div className="grid grid-cols-2 py-1 border-b border-slate-100">
                  <span className="text-slate-500">Parent Phone</span>
                  <span className="font-medium">{userRow.parentPhone || "—"}</span>
                </div>
              </>
            )}
            <div className="grid grid-cols-2 py-1 border-b border-slate-100">
              <span className="text-slate-500">{isStudent ? "Student Phone" : "Phone"}</span>
              <span className="font-medium">{user.phone || "—"}</span>
            </div>
            <div className="grid grid-cols-2 py-1 border-b border-slate-100">
              <span className="text-slate-500">City</span>
              <span className="font-medium">{userRow.city || "—"}</span>
            </div>
            <div className="grid grid-cols-2 py-1">
              <span className="text-slate-500">Joining Date</span>
              <span className="font-medium">{format(new Date(user.createdAt), "dd MMM yyyy")}</span>
            </div>
          </CardContent>
        </Card>

        {/* Chess Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Chess Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 py-1 border-b border-slate-100">
              <span className="text-slate-500">Chess.com ID</span>
              <span className="font-medium">{userRow.chessComId || "—"}</span>
            </div>
            <div className="grid grid-cols-2 py-1 border-b border-slate-100">
              <span className="text-slate-500">Chess.com Rating</span>
              <span className="font-medium">{userRow.chessComRating || "—"}</span>
            </div>
            <div className="grid grid-cols-2 py-1 border-b border-slate-100">
              <span className="text-slate-500">Lichess ID</span>
              <span className="font-medium">{userRow.lichessId || "—"}</span>
            </div>
            <div className="grid grid-cols-2 py-1 border-b border-slate-100">
              <span className="text-slate-500">Lichess Rating</span>
              <span className="font-medium">{userRow.lichessRating || "—"}</span>
            </div>

            {isStudent && (
              <div className="grid grid-cols-2 py-1">
                <span className="text-slate-500">Assigned Batches</span>
                <span className="font-medium">
                  {user.studentProfile!.enrollments.length > 0
                    ? user.studentProfile!.enrollments.map(e => e.batch.name).join(", ")
                    : "None"}
                </span>
              </div>
            )}
            {isCoach && (
              <div className="grid grid-cols-2 py-1">
                <span className="text-slate-500">Assigned Batches</span>
                <span className="font-medium">
                  {user.coachProfile!.batches.length > 0
                    ? user.coachProfile!.batches.map(b => b.name).join(", ")
                    : "None"}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Stats & Recent Classes (Student) */}
        {isStudent && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Attendance</span>
                <span className="text-sm font-normal text-slate-500">
                  {totalClasses > 0 ? Math.round((present / totalClasses) * 100) : 0}% Present
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <div className="bg-slate-50 p-3 rounded-md flex-1 text-center border border-slate-100">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total</p>
                  <p className="text-xl font-semibold">{totalClasses}</p>
                </div>
                <div className="bg-emerald-50 p-3 rounded-md flex-1 text-center border border-emerald-100">
                  <p className="text-xs text-emerald-600 uppercase tracking-wider mb-1">Present</p>
                  <p className="text-xl font-semibold text-emerald-700">{present}</p>
                </div>
                <div className="bg-rose-50 p-3 rounded-md flex-1 text-center border border-rose-100">
                  <p className="text-xs text-rose-600 uppercase tracking-wider mb-1">Absent</p>
                  <p className="text-xl font-semibold text-rose-700">{absent}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Recent Classes</h4>
                {user.studentProfile!.attendanceRecords.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-2">No classes attended yet.</p>
                ) : (
                  <div className="space-y-2">
                    {user.studentProfile!.attendanceRecords.slice(0, 5).map(record => (
                      <div key={record.id} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0 text-sm">
                        <div>
                          <p className="font-medium text-slate-800">{format(new Date(record.classLog.date), "dd MMM yyyy")}</p>
                          <p className="text-xs text-slate-500">{record.classLog.batch.name}</p>
                        </div>
                        <Badge variant={record.status === "PRESENT" ? "success" : "danger"}>
                          {record.status === "PRESENT" ? "Present" : "Absent"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Coach Details & Stats (Teacher) */}
        {isCoach && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Coach Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <div className="bg-slate-50 p-3 rounded-md flex-1 text-center border border-slate-100">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Classes Held</p>
                  <p className="text-xl font-semibold">{coachTotalClasses}</p>
                </div>
                <div className="bg-emerald-50 p-3 rounded-md flex-1 text-center border border-emerald-100">
                  <p className="text-xs text-emerald-600 uppercase tracking-wider mb-1">Total Payouts</p>
                  <p className="text-xl font-semibold text-emerald-700">₹{coachPayoutTotal.toLocaleString()}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Recent Classes</h4>
                {user.coachProfile!.classLogs.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-2">No classes logged yet.</p>
                ) : (
                  <div className="space-y-2">
                    {user.coachProfile!.classLogs.slice(0, 5).map(log => (
                      <div key={log.id} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0 text-sm">
                        <div>
                          <p className="font-medium text-slate-800">{format(new Date(log.date), "dd MMM yyyy")}</p>
                          <p className="text-xs text-slate-500">{log.topicCovered || "No topic"}</p>
                        </div>
                        <span className="font-medium text-emerald-600">₹{log.payoutAmount}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Coming Soon Sections */}
        <Card className="opacity-75 bg-slate-50/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              Fee Information
              <Badge variant="neutral" className="text-xs font-normal">Coming Soon</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-500 flex flex-col items-center justify-center py-8">
            <p>Module 8 (Fee Tracking System) is scheduled for future implementation.</p>
          </CardContent>
        </Card>

        <Card className="opacity-75 bg-slate-50/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              Tickets & Feedback
              <Badge variant="neutral" className="text-xs font-normal">Coming Soon</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-500 flex flex-col items-center justify-center py-8">
            <p>Modules 9 & 10 (Feedback and Tickets) will appear here.</p>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
