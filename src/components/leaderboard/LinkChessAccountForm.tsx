'use client';

import { useState, useTransition } from 'react';
import { linkChessAccount } from '@/actions/leaderboard/account-actions';
import { ExternalLink, Link2, Loader2, CheckCircle, XCircle } from 'lucide-react';

interface LinkChessAccountFormProps {
  currentChessCom?: string | null;
  currentLichess?: string | null;
  onSuccess?: () => void;
}

export function LinkChessAccountForm({
  currentChessCom,
  currentLichess,
  onSuccess,
}: LinkChessAccountFormProps) {
  const [chessComUsername, setChessComUsername] = useState(currentChessCom ?? '');
  const [lichessUsername, setLichessUsername] = useState(currentLichess ?? '');
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    startTransition(async () => {
      const res = await linkChessAccount({
        chessComUsername: chessComUsername.trim() || null,
        lichessUsername: lichessUsername.trim() || null,
      });
      setResult(res);
      if (res.success && onSuccess) onSuccess();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent pr-10"
          />
          {chessComUsername && (
            <a
              href={`https://www.chess.com/member/${chessComUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute right-2 top-2 text-slate-400 hover:text-brand-600"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
        {currentChessCom && (
          <p className="text-xs text-emerald-600 mt-1">
            ✓ Currently linked: {currentChessCom}
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
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent pr-10"
          />
          {lichessUsername && (
            <a
              href={`https://lichess.org/@/${lichessUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute right-2 top-2 text-slate-400 hover:text-brand-600"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
        {currentLichess && (
          <p className="text-xs text-emerald-600 mt-1">
            ✓ Currently linked: {currentLichess}
          </p>
        )}
      </div>

      {/* Result feedback */}
      {result && (
        <div className={`flex items-start gap-2 p-3 rounded-lg text-xs ${result.success ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
          {result.success ? (
            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          )}
          <span className={result.success ? 'text-emerald-700' : 'text-red-700'}>
            {result.success ? 'Chess accounts linked successfully!' : result.error}
          </span>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Link2 className="w-4 h-4" />
        )}
        {isPending ? 'Verifying...' : 'Save Chess Accounts'}
      </button>

      <p className="text-[11px] text-slate-400 text-center">
        Usernames are verified against the Chess.com and Lichess APIs before saving.
      </p>
    </form>
  );
}
