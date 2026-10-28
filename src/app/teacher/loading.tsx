export default function TeacherLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[55vh] gap-4 py-12">
      <div className="relative flex items-center justify-center">
        <div className="absolute w-14 h-14 rounded-full bg-amber-500/10 dark:bg-amber-500/20 animate-ping" />
        <div className="w-12 h-12 rounded-full border-3 border-amber-200 dark:border-amber-900/60 border-t-amber-600 dark:border-t-amber-400 animate-spin shadow-sm" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Loading coach portal...
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          Fetching schedules and teaching records
        </p>
      </div>
    </div>
  );
}
