import { cn } from '@/lib/utils';

export function Checkbox({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type="checkbox"
      className={cn(
        'h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-2 focus:ring-brand-100',
        className,
      )}
      {...props}
    />
  );
}
