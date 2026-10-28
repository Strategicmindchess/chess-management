export default function LeaderboardLoading() {
  return (
    <div className="space-y-8 max-w-7xl relative pb-10">
      <div>
        <div className="h-8 w-44 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
        <div className="h-4 w-64 bg-slate-100 dark:bg-slate-800/60 rounded-md mt-2 animate-pulse" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5 space-y-3 animate-pulse">
            <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-8 w-1/2 bg-slate-100 dark:bg-slate-800/60 rounded" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-slate-900/40 space-y-4 animate-pulse">
        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 w-full bg-slate-100 dark:bg-slate-800/50 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
