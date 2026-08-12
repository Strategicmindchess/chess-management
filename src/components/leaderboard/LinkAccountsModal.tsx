'use client';

import { useState, useTransition } from 'react';
import {
  migrateSingleStudentFromProfile,
  migrateAllChessAccountsFromProfiles,
  adminLinkChessAccount,
  adminUnlinkChessAccount,
} from '@/actions/leaderboard/account-actions';
import {
  Link2, Link2Off, Users, CheckCircle, XCircle, AlertCircle,
  Loader2, Search, X, ExternalLink, Zap, ChevronDown, ChevronUp,
} from 'lucide-react';

interface Student {
  studentProfileId: string;
  name: string;
  email: string;
  legacyChessComId?: string | null;
  legacyLichessId?: string | null;
  hasLegacyData: boolean;
  isLinked: boolean;
  chessAccount: {
    chessComUsername?: string | null;
    lichessUsername?: string | null;
  } | null;
}

function StudentRow({ student, onLinked }: { student: Student; onLinked: () => void }) {
  const [showManual, setShowManual] = useState(false);
  const [chessComUsername, setChessComUsername] = useState(student.legacyChessComId ?? '');
  const [lichessUsername, setLichessUsername] = useState(student.legacyLichessId ?? '');
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);

  function handleAutoLink() {
    setResult(null);
    startTransition(async () => {
      const res = await migrateSingleStudentFromProfile(student.studentProfileId);
      setResult(res);
      if (res.success) onLinked();
    });
  }

  function handleManualLink(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    startTransition(async () => {
      const res = await adminLinkChessAccount(student.studentProfileId, {
        chessComUsername: chessComUsername.trim() || null,
        lichessUsername: lichessUsername.trim() || null,
      });
      setResult(res);
      if (res.success) { setShowManual(false); onLinked(); }
    });
  }

  function handleUnlink() {
    setResult(null);
    startTransition(async () => {
      const res = await adminUnlinkChessAccount(student.studentProfileId);
      setResult(res);
      if (res.success) onLinked();
    });
  }

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${
      student.isLinked ? 'border-slate-200' : student.hasLegacyData ? 'border-blue-200 bg-blue-50/20' : 'border-amber-200 bg-amber-50/20'
    }`}>
      {/* Row */}
      <div className="flex items-center gap-3 p-3">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-600 font-bold text-xs">
          {student.name.slice(0, 2).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{student.name}</p>
          <div className="flex gap-3 mt-0.5 flex-wrap">
            {student.isLinked ? (
              <>
                {student.chessAccount?.chessComUsername && (
                  <a href={`https://chess.com/member/${student.chessAccount.chessComUsername}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                    ♟ {student.chessAccount.chessComUsername} <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
                {student.chessAccount?.lichessUsername && (
                  <a href={`https://lichess.org/@/${student.chessAccount.lichessUsername}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs text-slate-600 hover:underline flex items-center gap-0.5">
                    ⚙ {student.chessAccount.lichessUsername} <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </>
            ) : student.hasLegacyData ? (
              <span className="text-xs text-blue-600">
                Profile has: {[student.legacyChessComId, student.legacyLichessId].filter(Boolean).join(' / ')}
              </span>
            ) : (
              <span className="text-xs text-amber-600">No chess IDs in profile</span>
            )}
          </div>
        </div>

        {/* Status badge + actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {student.isLinked ? (
            <>
              <span className="hidden sm:flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1">
                <CheckCircle className="w-3 h-3" /> Linked
              </span>
              <button onClick={handleUnlink} disabled={isPending}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                title="Unlink account">
                <Link2Off className="w-4 h-4" />
              </button>
            </>
          ) : student.hasLegacyData ? (
            <button onClick={handleAutoLink} disabled={isPending}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-brand-600 text-white font-semibold rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
              {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}
              Link
            </button>
          ) : (
            <button onClick={() => setShowManual((v) => !v)} disabled={isPending}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-300 font-semibold rounded-lg hover:bg-amber-100 transition-colors">
              Fill Details
              {showManual ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className={`mx-3 mb-2 flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg ${
          result.success ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {result.success ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
          {result.success ? 'Account linked! Fetch job queued.' : result.error}
        </div>
      )}

      {/* Manual entry form (only for students with no profile data) */}
      {showManual && (
        <form onSubmit={handleManualLink} className="border-t border-amber-200 p-3 bg-white space-y-3">
          <p className="text-xs text-slate-500">Enter chess platform usernames for this student:</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Chess.com Username</label>
              <input value={chessComUsername} onChange={(e) => setChessComUsername(e.target.value)}
                placeholder="e.g. MagnusCarlsen"
                className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lichess Username</label>
              <input value={lichessUsername} onChange={(e) => setLichessUsername(e.target.value)}
                placeholder="e.g. DrNykterstein"
                className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
          <button type="submit" disabled={isPending || (!chessComUsername && !lichessUsername)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-brand-600 text-white font-semibold rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
            {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}
            Link Account
          </button>
        </form>
      )}
    </div>
  );
}

interface LinkAccountsModalProps {
  students: Student[];
}

export function LinkAccountsModal({ students }: LinkAccountsModalProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'linked' | 'unlinked'>('all');
  const [bulkResult, setBulkResult] = useState<{ linked: number; failed: number; message: string } | null>(null);
  const [isBulkPending, startBulkTransition] = useTransition();
  // key to force re-render of the list after linking
  const [refreshKey, setRefreshKey] = useState(0);

  const filtered = students.filter((s) => {
    const matchesSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || (filter === 'linked' && s.isLinked) || (filter === 'unlinked' && !s.isLinked);
    return matchesSearch && matchesFilter;
  });

  const linkedCount = students.filter((s) => s.isLinked).length;
  const eligibleCount = students.filter((s) => !s.isLinked && s.hasLegacyData).length;

  function handleLinkAll() {
    setBulkResult(null);
    startBulkTransition(async () => {
      const res = await migrateAllChessAccountsFromProfiles();
      setBulkResult({ linked: res.linked, failed: res.failed ?? 0, message: res.message });
      setRefreshKey((k) => k + 1);
    });
  }

  return (
    <>
      {/* Trigger button */}
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 transition-colors shadow-sm">
        <Link2 className="w-4 h-4" />
        Link Accounts
        {eligibleCount > 0 && (
          <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-lg">{eligibleCount} ready</span>
        )}
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-brand-600" />
                  Link Chess Accounts
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {linkedCount}/{students.length} linked · {eligibleCount} can auto-link from profile data
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Toolbar */}
            <div className="p-3 border-b border-slate-100 space-y-2">
              {/* Bulk action */}
              <div className="flex items-center gap-2">
                <button onClick={handleLinkAll} disabled={isBulkPending || eligibleCount === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-xs font-bold rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors">
                  {isBulkPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  Link All Eligible ({eligibleCount})
                </button>
                <p className="text-xs text-slate-400">Uses chess IDs already stored in each student's profile — no typing needed</p>
              </div>

              {/* Bulk result */}
              {bulkResult && (
                <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-xl ${
                  bulkResult.failed === 0 ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-amber-50 border border-amber-200 text-amber-700'
                }`}>
                  {bulkResult.failed === 0 ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  {bulkResult.message}
                </div>
              )}

              {/* Search + filter */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search student..."
                    className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                  <option value="all">All</option>
                  <option value="unlinked">Not Linked</option>
                  <option value="linked">Linked</option>
                </select>
              </div>
            </div>

            {/* Student list */}
            <div key={refreshKey} className="flex-1 overflow-y-auto p-3 space-y-2">
              {filtered.length === 0 ? (
                <div className="py-10 text-center">
                  <Users className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No students match your search.</p>
                </div>
              ) : (
                filtered.map((student) => (
                  <StudentRow key={student.studentProfileId} student={student} onLinked={() => setRefreshKey((k) => k + 1)} />
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-100 flex justify-end">
              <button onClick={() => setOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
