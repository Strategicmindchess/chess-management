'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { refreshAllStudents, triggerLeaderboardCalc, clearLeaderboardCache } from '@/actions/leaderboard/fetch-actions';
import { RefreshCw, Calculator, Trash2, Loader2, CheckCircle, XCircle } from 'lucide-react';

interface AdminRefreshControlsProps {
  periodStart: string;
  isCalculating: boolean;
}

export function AdminRefreshControls({ periodStart, isCalculating }: AdminRefreshControlsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState<Record<string, { success: boolean; message?: string; error?: string }>>({});

  useEffect(() => {
    if (isCalculating) {
      const interval = setInterval(() => {
        router.refresh();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isCalculating, router]);

  function run(key: string, action: () => Promise<{ success: boolean; message?: string; error?: string }>) {
    startTransition(async () => {
      const res = await action();
      setResults((prev) => ({ ...prev, [key]: res }));
    });
  }

  const buttons = [
    {
      key: 'fetchAll',
      label: 'Refresh All Students',
      description: 'Queue chess API fetch for all linked students',
      icon: RefreshCw,
      color: 'bg-brand-600 hover:bg-brand-700',
      action: () => refreshAllStudents('MONTHLY'),
    },
    {
      key: 'calc',
      label: 'Recalculate Scores',
      description: 'Run leaderboard score calculation worker',
      icon: Calculator,
      color: 'bg-purple-600 hover:bg-purple-700',
      action: () => triggerLeaderboardCalc('MONTHLY'),
    },
    {
      key: 'clear',
      label: 'Clear Cache',
      description: 'Remove Redis cache for current month',
      icon: Trash2,
      color: 'bg-slate-600 hover:bg-slate-700',
      action: () => clearLeaderboardCache('MONTHLY', periodStart),
    },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <h3 className="text-sm font-bold text-slate-800 mb-3">Admin Controls</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {buttons.map((btn) => {
          const Icon = btn.icon;
          const res = results[btn.key];
          return (
            <div key={btn.key} className="space-y-1.5">
              <button
                onClick={() => run(btn.key, btn.action)}
                disabled={isPending}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-lg ${btn.color} disabled:opacity-50 transition-colors`}
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
                {btn.label}
              </button>
              <p className="text-[11px] text-slate-400 text-center">{btn.description}</p>
              {res && (
                <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${res.success ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
                  {res.success ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {res.success ? res.message : res.error}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
