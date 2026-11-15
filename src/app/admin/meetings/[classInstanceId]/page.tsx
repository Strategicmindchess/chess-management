import { requireRole } from '@/lib/dal';
import { Role } from '@/lib/enums';
import { MeetingHistoryView } from '@/components/meet/meeting-history';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    classInstanceId: string;
  }>;
}

export default async function AdminMeetingDetailPage({ params }: PageProps) {
  await requireRole([Role.ADMIN]);
  const { classInstanceId } = await params;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/meetings"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Meetings
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Class Session Meeting Audit
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Detailed telemetry, participant intervals, and recordings for class instance{' '}
          <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
            {classInstanceId}
          </code>
        </p>
      </div>

      <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading audit log...</div>}>
        <MeetingHistoryView classInstanceId={classInstanceId} />
      </Suspense>
    </div>
  );
}

