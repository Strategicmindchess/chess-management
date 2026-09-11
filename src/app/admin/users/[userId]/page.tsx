import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";
import { ROLE_LABEL } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EditUserButton } from "./edit-user-button";
import { CoachPayoutSettings } from "@/components/admin/coach-payout-settings";
import { format } from "date-fns";

import { unstable_cache } from "next/cache";

const getUserProfileData = unstable_cache(
  async (userId: string) => {
    const baseUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: true,
        coachProfile: true,
      }
    });

    if (!baseUser) return null;

    let studentProfile = baseUser.studentProfile as any;
    let coachProfile = baseUser.coachProfile as any;

    if (baseUser.role === Role.STUDENT && baseUser.studentProfile) {
      const [enrollments, attendanceRecords] = await Promise.all([
        prisma.batchStudent.findMany({
          where: { studentProfileId: baseUser.studentProfile.id },
          include: { batch: { include: { coach: { include: { user: true } } } } }
        }),
        prisma.attendanceRecord.findMany({
          where: { studentProfileId: baseUser.studentProfile.id },
          include: { classLog: { include: { batch: true } } },
          orderBy: { classLog: { date: "desc" } },
        })
      ]);
      studentProfile = { ...baseUser.studentProfile, enrollments, attendanceRecords };
    }

    let penalizedClassLogs: any[] = [];

    if (baseUser.role === Role.TEACHER && baseUser.coachProfile) {
      const [batches, classLogs, payoutRates, payoutAdjustments, penalized] = await Promise.all([
        prisma.batch.findMany({ where: { coachProfileId: baseUser.coachProfile.id } }),
        prisma.classLog.findMany({
          where: { coachProfileId: baseUser.coachProfile.id },
          orderBy: { date: "desc" },
          take: 50,
          include: { batch: true },
        }),
        prisma.coachPayoutRate.findMany({
          where: { coachProfileId: baseUser.coachProfile.id },
          orderBy: [{ level: "asc" }, { durationMins: "asc" }]
        }),
        prisma.payoutAdjustment.findMany({
          where: { coachProfileId: baseUser.coachProfile.id },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
        prisma.classLog.findMany({
          where: { 
            coachProfileId: baseUser.coachProfile.id,
            penaltyAmount: { gt: 0 } 
          },
          orderBy: { date: 'desc' },
          include: { batch: true }
        })
      ]);
      coachProfile = { ...baseUser.coachProfile, batches, classLogs, payoutRates, payoutAdjustments };
      penalizedClassLogs = penalized;
    }

    return {
      user: {
        ...baseUser,
        studentProfile,
        coachProfile
      },
      penalizedClassLogs
    };
  },
  ['admin-user-profile'],
  { tags: ['admin-user-profile'], revalidate: 3600 }
);

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  await requireRole([Role.ADMIN]);

  const { userId } = await params;

  const data = await getUserProfileData(userId);
  
  if (!data || !data.user) notFound();
  
  const { user, penalizedClassLogs } = data;

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
  if (isStudent && user.studentProfile.attendanceRecords) {
    totalClasses = user.studentProfile.attendanceRecords.length;
    present = user.studentProfile.attendanceRecords.filter((a: any) => a.status === "PRESENT").length;
    absent = totalClasses - present;
  }

  // Compute Coach Stats
  let coachTotalClasses = 0;
  let coachPayoutTotal = 0;
  let coachPenaltyTotal = 0;
  if (isCoach && user.coachProfile.classLogs) {
    coachTotalClasses = user.coachProfile.classLogs.length;
    coachPayoutTotal = user.coachProfile.classLogs.reduce((acc: number, log: any) => acc + log.payoutAmount, 0);
    coachPenaltyTotal = user.coachProfile.classLogs.reduce((acc: number, log: any) => {
      if (!log.penaltyWaived) return acc + (log.penaltyAmount ?? 0);
      return acc;
    }, 0);
  }

  const LEVELS = ["BEGINNER","CORE_1","CORE_2","CORE_3","CORE_4","INTERMEDIATE_1","INTERMEDIATE_2","INTERMEDIATE_3","ADVANCE_1","ADVANCE_2","ELITE"];
  const DURATIONS = [30, 40, 45, 50, 60];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{user.name}</h1>
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
                    ? user.studentProfile!.enrollments.map((e: any) => e.batch.name).join(", ")
                    : "None"}
                </span>
              </div>
            )}
            {isCoach && (
              <div className="grid grid-cols-2 py-1">
                <span className="text-slate-500">Assigned Batches</span>
                <span className="font-medium">
                  {user.coachProfile!.batches.length > 0
                    ? user.coachProfile!.batches.map((b: any) => b.name).join(", ")
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
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md flex-1 text-center border border-slate-100 dark:border-slate-700">
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total</p>
                  <p className="text-xl font-semibold dark:text-white">{totalClasses}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-md flex-1 text-center border border-emerald-100 dark:border-emerald-800">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Present</p>
                  <p className="text-xl font-semibold text-emerald-700 dark:text-emerald-300">{present}</p>
                </div>
                <div className="bg-rose-50 dark:bg-rose-900/20 p-3 rounded-md flex-1 text-center border border-rose-100 dark:border-rose-800">
                  <p className="text-xs text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-1">Absent</p>
                  <p className="text-xl font-semibold text-rose-700 dark:text-rose-300">{absent}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Recent Classes</h4>
                {user.studentProfile!.attendanceRecords.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-2">No classes attended yet.</p>
                ) : (
                  <div className="space-y-2">
                    {user.studentProfile!.attendanceRecords.slice(0, 5).map((record: any) => (
                      <div key={record.id} className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800 last:border-0 text-sm">
                        <div>
                          <p className="font-medium text-slate-800 dark:text-slate-200">{format(new Date(record.classLog.date), "dd MMM yyyy")}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{record.classLog.batch.name}</p>
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
            <CardContent className="max-h-[650px] overflow-y-auto pr-4 mr-1 custom-scrollbar">
              <div className="flex gap-4 mb-6">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md flex-1 text-center border border-slate-100 dark:border-slate-700">
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Classes Held</p>
                  <p className="text-xl font-semibold dark:text-white">{coachTotalClasses}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-md flex-1 text-center border border-emerald-100 dark:border-emerald-800">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Total Payouts</p>
                  <p className="text-xl font-semibold text-emerald-700 dark:text-emerald-300">₹{coachPayoutTotal.toLocaleString()}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Recent Classes</h4>
                {user.coachProfile!.classLogs.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-2">No classes logged yet.</p>
                ) : (
                  <div className="space-y-2">
                    {user.coachProfile!.classLogs.slice(0, 5).map((log: any) => (
                      <div key={log.id} className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800 last:border-0 text-sm">
                        <div>
                          <p className="font-medium text-slate-800 dark:text-slate-200">{format(new Date(log.date), "dd MMM yyyy")}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{log.topicCovered || "No topic"}</p>
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

        {/* Payout Settings — Coach only (interactive client component) */}
        {isCoach && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payout Settings</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[650px] overflow-y-auto pr-4 mr-1 custom-scrollbar">
              <CoachPayoutSettings
                coachId={user.coachProfile!.id}
                tdsApplicable={user.coachProfile!.tdsApplicable}
                employmentType={user.coachProfile!.employmentType}
                payoutRates={user.coachProfile!.payoutRates.map((r: any) => ({
                  level: r.level as string,
                  durationMins: r.durationMins,
                  ratePerSession: r.ratePerSession,
                }))}
                payoutAdjustments={user.coachProfile!.payoutAdjustments.map((a: any) => ({
                  id: a.id,
                  type: a.type,
                  amount: a.amount,
                  reason: a.reason,
                  month: a.month,
                }))}
                classLogs={user.coachProfile!.classLogs.map((l: any) => ({
                  id: l.id,
                  date: new Date(l.date).toISOString(),
                  batch: l.batch ? { name: l.batch.name } : null,
                  penaltyAmount: l.penaltyAmount ?? 0,
                  penaltyWaived: l.penaltyWaived ?? false,
                  penaltyNote: l.penaltyNote ?? null,
                }))}
                penalizedLogs={penalizedClassLogs.map(l => ({
                  id: l.id,
                  date: new Date(l.date).toISOString(),
                  batch: l.batch ? { name: l.batch.name } : null,
                  penaltyAmount: l.penaltyAmount ?? 0,
                  penaltyWaived: l.penaltyWaived ?? false,
                  penaltyNote: l.penaltyNote ?? null,
                }))}
                coachPenaltyTotal={coachPenaltyTotal}
              />
            </CardContent>
          </Card>
        )}

        {/* Fee Information for Student */}
        {isStudent && (
          <Card className="opacity-75 bg-slate-50/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Fee Information
                <Badge variant="neutral" className="text-xs font-normal">See Fee Ledger</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-500 flex flex-col items-center justify-center py-8">
              <p>View this student&apos;s fee records in the Fee Ledger section.</p>
            </CardContent>
          </Card>
        )}

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
