import { cn } from '@/lib/utils';

export function Select({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900',
        'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100',
        'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
        'dark:border-slate-800 dark:bg-[#11141c]/90 dark:backdrop-blur-xl dark:text-slate-200',
        'dark:focus:border-brand-500 dark:focus:ring-brand-900/30',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
