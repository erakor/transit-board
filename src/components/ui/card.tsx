import * as React from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: React.ComponentProps<'section'>) {
  return (
    <section
      data-slot="card"
      className={cn('flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground', className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.ComponentProps<'header'>) {
  return <header data-slot="card-header" className={cn('flex h-[2.6rem] shrink-0 items-center justify-between gap-3 px-4', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  return <h2 data-slot="card-title" className={cn('truncate text-[1.15rem] font-semibold', className)} {...props} />;
}

export function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-2', className)} {...props} />;
}
