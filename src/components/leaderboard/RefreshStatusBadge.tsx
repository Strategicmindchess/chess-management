'use client';

import { useState, useTransition } from 'react';
import { requestMyDataRefresh } from '@/actions/leaderboard/fetch-actions';
import { RefreshCw, Clock, Loader2, CheckCircle, XCircle } from 'lucide-react';

interface RefreshButtonProps {
  lastRefreshedAt: Date | null;
  isRefreshing: boolean;
  cooldownMinutes: number;
  periodType?: 'WEEKLY' | 'MONTHLY';
}

export function RefreshStatusBadge({
  lastRefreshedAt,
  isRefreshing: initialRefreshing,
  cooldownMinutes,
  periodType = 'MONTHLY',
}: RefreshButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; message?: string; error?: string; cached?: boolean } | null>(null);
  const [localRefreshing, setLocalRefreshing] = useState(initialRefreshing);

  const isRunning = isPending || localRefreshing;

  function formatRelative(date: Date | null): string {
    if (!date) return 'Never';
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return date.toLocaleDateString('en-IN');
  }

  function handleRefresh() {
    setResult(null);
    startTransition(async () => {
      const res = await requestMyDataRefresh(periodType);
      setResult(res);
      if (res.success) {
        setLocalRefreshing(true);
        // Auto-clear after 30 seconds
        setTimeout(() => setLocalRefreshing(false), 30_000);
      }
    });
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      {/* Last refresh info */}
      <div className="flex items-center gap-1.5 text-xs text-slate-400">
        <Clock className="w-3.5 h-3.5" />
        <span>Last updated: {formatRelative(lastRefreshedAt)}</span>
      </div>

      {/* Refresh button */}
      <button
        onClick={handleRefresh}
        disabled={isRunning}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-brand-300 text-brand-600 hover:bg-brand-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isRunning ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {localRefreshing ? 'Refreshing...' : 'Starting...'}
          </>
        ) : (
          <>
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh My Data
          </>
        )}
      </button>

      {/* Result message */}
      {result && (
        <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg ${
          result.success ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'
        }`}>
          {result.success ? (
            <CheckCircle className="w-3.5 h-3.5" />
          ) : (
            <XCircle className="w-3.5 h-3.5" />
          )}
          <span>{result.success ? result.message : result.error}</span>
        </div>
      )}

      {localRefreshing && !isPending && (
        <div className="text-xs text-slate-400 flex items-center gap-1">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Worker is fetching your chess data...
        </div>
      )}
    </div>
  );
}
