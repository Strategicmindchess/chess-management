import { cn } from '@/lib/utils';

const VARIANT_CLASSES = {
  error: 'border-rose-200 bg-rose-50 text-rose-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  info: 'border-brand-200 bg-brand-50 text-brand-700',
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
