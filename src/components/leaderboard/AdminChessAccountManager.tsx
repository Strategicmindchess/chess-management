'use client';

import { useState, useTransition } from 'react';
import { adminLinkChessAccount, adminUnlinkChessAccount } from '@/actions/leaderboard/account-actions';
import {
  Link2, Link2Off, ExternalLink, Loader2, CheckCircle,
  XCircle, Search, ChevronDown, ChevronUp, UserCheck, UserX
} from 'lucide-react';

interface Student {
  studentProfileId: string;
  name: string;
  email: string;
  profilePictureUrl?: string | null;
  legacyChessComId?: string | null;
  legacyLichessId?: string | null;
  chessAccount: {
    chessComUsername?: string | null;
    lichessUsername?: string | null;
    chessComVerified: boolean;
    lichessVerified: boolean;
    updatedAt: Date;
  } | null;
  isLinked: boolean;
}

interface AdminChessAccountManagerProps {
  students: Student[];
}

function StudentRow({ student }: { student: Student }) {
  const [expanded, setExpanded] = useState(!student.isLinked);
  const [chessComUsername, setChessComUsername] = useState(
    student.chessAccount?.chessComUsername ?? student.legacyChessComId ?? ''
  );
  const [lichessUsername, setLichessUsername] = useState(
    student.chessAccount?.lichessUsername ?? student.legacyLichessId ?? ''
  );
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);

  function handleLink(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    startTransition(async () => {
      const res = await adminLinkChessAccount(student.studentProfileId, {
        chessComUsername: chessComUsername.trim() || null,
        lichessUsername: lichessUsername.trim() || null,
      });
      setResult(res);
      if (res.success) setExpanded(false);
    });
  }

  function handleUnlink() {
    setResult(null);
    startTransition(async () => {
      const res = await adminUnlinkChessAccount(student.studentProfileId);
      setResult(res);
    });
  }

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${student.isLinked ? 'border-slate-200' : 'border-amber-200 bg-amber-50/30'}`}>
      {/* Row header */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 text-brand-700 text-xs font-bold">
          {student.name.slice(0, 2).toUpperCase()}
        </div>

        {/* Name / email */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{student.name}</p>
          <p className="text-xs text-slate-400 truncate">{student.email}</p>
        </div>

        {/* Status */}
        {student.isLinked ? (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1">
            <UserCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {student.chessAccount?.chessComUsername || student.chessAccount?.lichessUsername}
            </span>
            <span className="sm:hidden">Linked</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
            <UserX className="w-3.5 h-3.5" />
            Not linked
          </div>
        )}

        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </div>

      {/* Expanded form */}
      {expanded && (
        <form onSubmit={handleLink} className="border-t border-slate-100 p-4 space-y-4 bg-white">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Chess.com */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Chess.com Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={chessComUsername}
                  onChange={(e) => setChessComUsername(e.target.value)}
                  placeholder="e.g. MagnusCarlsen"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent pr-8"
                />
                {chessComUsername && (
                  <a
                    href={`https://www.chess.com/member/${chessComUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-2 top-2.5 text-slate-400 hover:text-brand-600"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
              {student.chessAccount?.chessComVerified && (
                <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Verified
                </p>
              )}
              {student.legacyChessComId && !student.chessAccount?.chessComUsername && (
                <p className="text-xs text-amber-600 mt-1">
                  Legacy ID in profile: <strong>{student.legacyChessComId}</strong>
                </p>
              )}
            </div>

            {/* Lichess */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Lichess Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={lichessUsername}
                  onChange={(e) => setLichessUsername(e.target.value)}
                  placeholder="e.g. DrNykterstein"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent pr-8"
                />
                {lichessUsername && (
                  <a
                    href={`https://lichess.org/@/${lichessUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-2 top-2.5 text-slate-400 hover:text-brand-600"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
              {student.chessAccount?.lichessVerified && (
                <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Verified
                </p>
              )}
              {student.legacyLichessId && !student.chessAccount?.lichessUsername && (
                <p className="text-xs text-amber-600 mt-1">
                  Legacy ID in profile: <strong>{student.legacyLichessId}</strong>
                </p>
              )}
            </div>
          </div>

          {/* Result feedback */}
          {result && (
            <div className={`flex items-center gap-2 text-xs p-2 rounded-lg ${result.success ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
              {result.success ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              {result.success ? 'Chess account linked! Fetch job queued.' : result.error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
              {student.isLinked ? 'Update Account' : 'Link Account'}
            </button>

            {student.isLinked && (
              <button
                type="button"
                disabled={isPending}
                onClick={handleUnlink}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 border border-red-200 text-xs font-semibold rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
              >
                <Link2Off className="w-3.5 h-3.5" />
                Unlink
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

export function AdminChessAccountManager({ students }: AdminChessAccountManagerProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'linked' | 'unlinked'>('all');

  const filtered = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === 'all' ||
      (filter === 'linked' && s.isLinked) ||
      (filter === 'unlinked' && !s.isLinked);
    return matchesSearch && matchesFilter;
  });

  const linkedCount = students.filter((s) => s.isLinked).length;
  const unlinkedCount = students.length - linkedCount;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: 'Total Students', value: students.length, color: 'text-slate-700' },
          { label: 'Linked', value: linkedCount, color: 'text-emerald-600' },
          { label: 'Not Linked', value: unlinkedCount, color: 'text-amber-600' },
        ].map((s) => (
          <div key={s.label} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search & filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          <option value="all">All</option>
          <option value="unlinked">Not Linked</option>
          <option value="linked">Linked</option>
        </select>
      </div>

      {/* Student list */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-0.5">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">No students match your search.</div>
        ) : (
          filtered.map((student) => (
            <StudentRow key={student.studentProfileId} student={student} />
          ))
        )}
      </div>
    </div>
  );
}
