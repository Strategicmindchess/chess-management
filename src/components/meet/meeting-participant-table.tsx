'use client';

import { ParticipantRecord } from '@/actions/meet/meeting-history-actions';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, ShieldCheck, HelpCircle } from 'lucide-react';

interface MeetingParticipantTableProps {
  participants: ParticipantRecord[];
}

export function MeetingParticipantTable({ participants }: MeetingParticipantTableProps) {
  if (participants.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-500 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
        <Users className="w-8 h-8 mx-auto mb-2 text-slate-400" />
        No participants recorded yet for this session.
      </div>
    );
  }

  function formatDuration(seconds: number): string {
    if (seconds <= 0) return '0m';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s > 0 ? `${s}s` : ''}`;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
        <thead className="bg-slate-50 dark:bg-slate-900 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
          <tr>
            <th className="px-4 py-3">Participant</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Identity Match</th>
            <th className="px-4 py-3">First Joined</th>
            <th className="px-4 py-3">Total Duration</th>
            <th className="px-4 py-3 text-center">Sessions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-[#11141c]">
          {participants.map((p) => (
            <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
              <td className="px-4 py-3">
                <div className="font-medium text-slate-900 dark:text-slate-100">
                  {p.displayName || 'Anonymous Guest'}
                </div>
                {p.email && <div className="text-xs text-slate-400">{p.email}</div>}
              </td>
              <td className="px-4 py-3">
                <Badge
                  variant={p.role === 'COACH' ? 'brand' : 'neutral'}
                  className={
                    p.role === 'COACH'
                      ? 'bg-amber-100 text-amber-900'
                      : p.role === 'STUDENT'
                      ? 'bg-blue-100 text-blue-900'
                      : 'bg-slate-100 text-slate-700'
                  }
                >
                  {p.role}
                </Badge>
              </td>
              <td className="px-4 py-3">
                {p.identityStatus === 'MATCHED' ? (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" /> Matched
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
                    <HelpCircle className="w-3.5 h-3.5" /> {p.identityStatus}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-xs">
                {p.firstJoinedAt ? new Date(p.firstJoinedAt).toLocaleTimeString() : '—'}
              </td>
              <td className="px-4 py-3 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {formatDuration(p.totalDurationSeconds)}
                </span>
              </td>
              <td className="px-4 py-3 text-center text-xs font-medium">
                {p.sessionsCount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
