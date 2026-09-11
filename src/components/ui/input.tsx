import { cn } from '@/lib/utils';

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900',
        'placeholder:text-slate-400',
        'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100',
        'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
        'dark:border-slate-800 dark:bg-[#11141c]/90 dark:backdrop-blur-xl dark:text-slate-200 dark:placeholder:text-slate-500',
        'dark:focus:border-brand-500 dark:focus:ring-brand-900/30',
        'dark:disabled:bg-[#141820] dark:disabled:text-slate-500',
        className,
      )}
      {...props}
    />
  );
}
