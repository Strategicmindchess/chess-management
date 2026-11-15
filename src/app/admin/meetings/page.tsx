import { requireRole } from '@/lib/dal';
import { Role } from '@/lib/enums';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Video, ExternalLink, Users, Calendar, ArrowRight } from 'lucide-react';
import { formatISTDate, formatClassTiming } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

export default async function AdminMeetingsPage() {
  await requireRole([Role.ADMIN]);

  const sessions = await prisma.meetingSession.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      classInstance: {
        include: {
          batch: true,
        },
      },
      coachProfile: {
        include: { user: true },
      },
      _count: {
        select: {
          participants: true,
          events: true,
        },
      },
      recording: true,
    },
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Video className="w-6 h-6 text-brand-600" />
            Google Meet Sessions & Audit Trail
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time telemetry, participant session tracking, and Google Meet conference audit logs.
          </p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-[#11141c] rounded-xl border border-slate-200 dark:border-slate-800">
          <Video className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">
            No Google Meet sessions recorded yet
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Sessions are created dynamically when a teacher starts a scheduled class.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-[#11141c] rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Batch / Class</th>
                <th className="px-5 py-3.5">Assigned Coach</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Participants</th>
                <th className="px-5 py-3.5">Started At</th>
                <th className="px-5 py-3.5">Recording</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {s.classInstance.batch.name}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                      <span>{s.classInstance.batch.code}</span>
                      <span>•</span>
                      <span>
                        {formatClassTiming(s.classInstance.startTime, s.classInstance.endTime)}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-medium text-slate-800 dark:text-slate-200">
                      {s.coachProfile.user.name}
                    </div>
                    <div className="text-xs text-slate-400">{s.coachProfile.user.email}</div>
                  </td>
                  <td className="px-5 py-4">
                    <Badge
                      variant={s.status === 'ACTIVE' ? 'success' : 'neutral'}
                      className={
                        s.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : s.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }
                    >
                      {s.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      {s._count.participants}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-500">
                    {s.startedAt ? new Date(s.startedAt).toLocaleString() : 'Not started'}
                  </td>
                  <td className="px-5 py-4">
                    {s.recording ? (
                      <Badge variant="brand" className="bg-purple-100 text-purple-900 text-xs">
                        {s.recording.transferStatus}
                      </Badge>
                    ) : (
                      <span className="text-xs text-slate-400">None</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/admin/meetings/${s.classInstanceId}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
                    >
                      Audit Details <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
