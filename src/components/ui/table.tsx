import { cn } from '@/lib/utils';

export function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full text-left text-sm', className)} {...props} />
    </div>
  );
}

export function TableHead({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead
      className={cn(
        'border-b border-slate-200 text-xs tracking-wide text-slate-500 uppercase',
        className,
      )}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody className={cn('divide-y divide-slate-100', className)} {...props} />;
}

export function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return <tr className={cn('hover:bg-slate-50/60', className)} {...props} />;
}

export function TableHeaderCell({ className, ...props }: React.ComponentProps<'th'>) {
  return <th className={cn('px-4 py-3 font-medium whitespace-nowrap', className)} {...props} />;
}

export function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return <td className={cn('px-4 py-3 text-slate-700', className)} {...props} />;
}
