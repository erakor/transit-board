'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertStrip } from '@/components/alert-strip';
import { BikeCardView, TransitCardView } from '@/components/transit-card';
import { useBoard, useBurnInShift, useServerNow, useWakeLock } from '@/components/use-board';
import { ageText, freshness } from '@/lib/freshness';
import { clock, inQuietHours } from '@/lib/time';
import { isDaytime } from '@/lib/sun';
import { cn } from '@/lib/utils';

function useThemeParam(): 'light' | 'dark' | null {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);
  useEffect(() => {
    const t = new URLSearchParams(location.search).get('theme');
    setTheme(t === 'light' || t === 'dark' ? t : null);
  }, []);
  return theme;
}

const dayName = (now: number) => new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(now * 1000));

export function BoardScreen() {
  const override = useThemeParam();
  const [quiet, setQuiet] = useState(false);
  const { board, receivedAt } = useBoard(quiet);
  const now = useServerNow(board, receivedAt);
  const shift = useBurnInShift();
  useWakeLock();

  const isQuiet = board ? inQuietHours(board.quietHours, now) : false;
  useEffect(() => setQuiet(isQuiet), [isQuiet]);

  const theme = override ?? (board ? (isDaytime(board.sun, now) ? 'light' : 'dark') : 'dark');
  useEffect(() => {
    document.documentElement.dataset.theme = isQuiet ? 'dark' : theme;
  }, [theme, isQuiet]);

  // time since the last good board, as the server's clock sees it
  const boardAge = board ? now - board.now : 0;
  const state = freshness(boardAge);
  const cards = useMemo(() => board?.cards ?? [], [board]);

  if (isQuiet) return <div className="fixed inset-0 bg-black" aria-hidden />;
  if (!board) return <div className="flex h-full items-center justify-center text-[1.4rem] text-muted-foreground">Loading…</div>;

  const cols = Math.min(3, Math.max(1, cards.length));
  return (
    <main className="flex h-full flex-col gap-[0.6rem] p-[0.8rem]" style={{ transform: `translate(${shift.x}px, ${shift.y}px)` }}>
      <header className="flex h-[3.4rem] shrink-0 items-center justify-between px-2">
        <div className="min-w-0">
          <h1 className="m-0 truncate text-[1.5rem] font-semibold leading-none">{board.title}</h1>
          <div className="mt-1 text-[1rem] text-muted-foreground">{dayName(now)}</div>
        </div>
        <div className="flex items-center gap-6">
          <span className={cn('text-[1rem]', state === 'fresh' && 'text-muted-foreground', state === 'amber' && 'font-medium text-warn', state === 'stale' && 'font-medium text-bad')} data-freshness={state}>
            {state === 'stale' ? `data is stale · ${ageText(boardAge)}` : ageText(boardAge)}
          </span>
          <span className="tnum text-[3rem] font-bold leading-none">{clock(now)}</span>
        </div>
      </header>
      <div className="grid min-h-0 flex-1 gap-[0.6rem]" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridAutoRows: 'minmax(0, 1fr)' }}>
        {cards.map((card) => {
          const age = now - (card.updatedAt ?? board.now);
          const stale = state === 'stale' || freshness(age) === 'stale';
          return card.kind === 'citibike' ? <BikeCardView key={card.id} card={card} stale={stale} /> : <TransitCardView key={card.id} card={card} now={now} stale={stale} />;
        })}
      </div>
      <AlertStrip items={board.alerts.items} error={board.alerts.status === 'error'} />
    </main>
  );
}
