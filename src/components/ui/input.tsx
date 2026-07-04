import { cn } from '@/lib/utils';

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900',
        'placeholder:text-slate-400',
        'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100',
        'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
        className,
      )}
      {...props}
    />
  );
}
