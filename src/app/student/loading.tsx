export default function StudentLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[55vh] gap-4 py-12">
      <div className="relative flex items-center justify-center">
        {/* Outer glowing pulsing ring */}
        <div className="absolute w-14 h-14 rounded-full bg-brand-500/10 dark:bg-brand-500/20 animate-ping" />
        {/* Modern rotating spinner ring */}
        <div className="w-12 h-12 rounded-full border-3 border-brand-200 dark:border-brand-900/60 border-t-brand-600 dark:border-t-brand-400 animate-spin shadow-sm" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Loading classroom...
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          Fetching your latest batches and progress
        </p>
      </div>
    </div>
  );
}
