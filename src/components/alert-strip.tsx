'use client';

import { useEffect, useState } from 'react';
import { RouteBullet } from '@/components/bullet';
import { alertLabel } from '@/lib/text';
import type { AlertItem, Bullet } from '@/lib/types';

const ROTATE_MS = 10_000;

/** The MTA writes routes in brackets: "[G]". Turn them into bullets. */
export function AlertText({ alert }: { alert: AlertItem }) {
  const byName = new Map(alert.routes.map((r) => [r.name, r] as const));
  const parts = alert.header.split(/\[([A-Za-z0-9]{1,3})\]/);
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 0) return <span key={i}>{part}</span>;
        const route: Bullet = byName.get(part) ?? { name: part, color: '#6b7280', textColor: '#ffffff' };
        return (
          <span key={i} className="mx-[0.2rem] inline-block align-middle">
            <RouteBullet route={route} size="sm" />
          </span>
        );
      })}
    </>
  );
}

/** One alert at a time across the full width, every 10 s, with a counter. */
export function AlertStrip({ items, error }: { items: AlertItem[]; error: boolean }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (items.length < 2) return;
    const id = setInterval(() => setI((n) => n + 1), ROTATE_MS);
    return () => clearInterval(id);
  }, [items.length]);
  const alert = items.length ? items[i % items.length]! : null;
  return (
    <section className="flex h-[3.6rem] items-center gap-4 overflow-hidden rounded-2xl border border-border bg-card px-4" aria-live="polite">
      {alert ? (
        <>
          <span className={`shrink-0 rounded-full border px-3 py-0.5 text-[1rem] font-medium ${alert.planned ? 'border-border text-muted-foreground' : 'border-warn text-warn'}`}>{alertLabel(alert)}</span>
          <p className="m-0 line-clamp-2 min-w-0 flex-1 text-[1.15rem] leading-tight">
            <AlertText alert={alert} />
          </p>
          <span className="tnum shrink-0 text-[1rem] text-muted-foreground">
            {(i % items.length) + 1} / {items.length}
          </span>
        </>
      ) : (
        <p className="m-0 text-[1.15rem] text-muted-foreground">{error ? 'Service alerts unavailable' : 'No service alerts'}</p>
      )}
    </section>
  );
}
