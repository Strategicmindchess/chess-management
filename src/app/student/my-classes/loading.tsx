export default function MyClassesLoading() {
  return (
    <div className="space-y-8 max-w-7xl relative pb-10">
      <div>
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
        <div className="h-4 w-72 bg-slate-100 dark:bg-slate-800/60 rounded-md mt-2 animate-pulse" />
      </div>

      <div className="h-10 w-56 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 bg-white dark:bg-slate-900/40 animate-pulse">
            <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-4 w-1/2 bg-slate-100 dark:bg-slate-800/60 rounded" />
            <div className="h-10 w-full bg-slate-100 dark:bg-slate-800/60 rounded-lg mt-4" />
          </div>
        ))}
      </div>
    </div>
  );
}
