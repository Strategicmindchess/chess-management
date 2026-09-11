import { cn } from '@/lib/utils';

const VARIANT_CLASSES = {
  error: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-400',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400',
  info: 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-900/20 dark:text-brand-300',
} as const;

type AlertProps = React.ComponentProps<'div'> & { variant?: keyof typeof VARIANT_CLASSES };

export function Alert({ className, variant = 'error', ...props }: AlertProps) {
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn('rounded-lg border px-3 py-2 text-sm', VARIANT_CLASSES[variant], className)}
      {...props}
    />
  );
}

