export default function AdminLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[55vh] gap-4 py-12">
      <div className="relative flex items-center justify-center">
        <div className="absolute w-14 h-14 rounded-full bg-purple-500/10 dark:bg-purple-500/20 animate-ping" />
        <div className="w-12 h-12 rounded-full border-3 border-purple-200 dark:border-purple-900/60 border-t-purple-600 dark:border-t-purple-400 animate-spin shadow-sm" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Loading administration...
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          Fetching academy metrics and operational data
        </p>
      </div>
    </div>
  );
}
