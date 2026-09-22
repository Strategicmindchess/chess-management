import { cn } from '@/lib/utils';

export function Checkbox({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type="checkbox"
      className={cn(
        // Light mode
        'h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-2 focus:ring-brand-100',
        // Dark mode — visible border, dark bg, brand accent when checked
        'dark:border-slate-500 dark:bg-[#1a1f2e] dark:checked:bg-brand-500 dark:checked:border-brand-500 dark:focus:ring-brand-500/30',
        'accent-brand-500 cursor-pointer',
        className,
      )}
      {...props}
    />
  );
}

