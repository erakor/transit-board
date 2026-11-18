import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RouteBullet } from '@/components/bullet';
import { clock } from '@/lib/time';
import { pickDepartures } from '@/lib/leave';
import { cn } from '@/lib/utils';
import type { BikeCard, Row, TransitCard } from '@/lib/types';

const ROW_H = 'h-[4.1rem]';

function Message({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 items-center justify-center text-[1.15rem] text-muted-foreground">{children}</div>;
}

function CardShell({ title, right, stale, children }: { title: string; right?: React.ReactNode; stale: boolean; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <span className="shrink-0 text-[1rem] text-muted-foreground">{right}</span>
      </CardHeader>
      <CardContent className={cn(stale && 'opacity-60 grayscale')}>{children}</CardContent>
    </Card>
  );
}

/** Same layout in every transit card: the following trains on the left, the big leave-in number on the right. */
function DepartureRow({ row, walkSec, now, stale }: { row: Row; walkSec: number; now: number; stale: boolean }) {
  const d = pickDepartures(row.deps, walkSec, now);
  const stops = d.primary?.dep.stopsAway;
  const line2 = d.primary?.dep.stalled
    ? 'stalled'
    : d.primary && d.primary.dep.assigned === false
      ? 'not yet assigned'
      : d.primary?.dep.delayed
        ? 'delayed'
        : stops !== undefined && stops !== null
          ? stops === 0
            ? 'at stop'
            : `${stops} stop${stops === 1 ? '' : 's'} away`
          : row.sub;
  return (
    <li className={cn('flex items-center gap-3 border-t border-border first:border-t-0', ROW_H)} data-row={row.key}>
      {row.bullet && <RouteBullet route={row.bullet} />}
      <div className="min-w-0 flex-1 leading-tight">
        <div className="flex items-center gap-2">
          <span className="truncate text-[1.15rem] font-medium">{row.label}</span>
          {row.warn && <span className="shrink-0 text-warn" aria-label="alert">⚠</span>}
        </div>
        <div className={cn('truncate text-[1rem]', d.primary?.dep.stalled || d.primary?.dep.delayed ? 'text-warn' : 'text-muted-foreground')}>
          {d.cancelled && !d.primary ? (
            <span>
              <s>{clock(d.cancelled.time!)}</s> cancelled
            </span>
          ) : (
            line2
          )}
        </div>
      </div>
      <div className={cn('tnum flex shrink-0 gap-3 text-[1.15rem] text-muted-foreground', stale ? '' : '')} aria-label="following trains">
        {d.following.map((f) => (
          <span key={f.dep.time} className={cn(f.dep.assigned === false && 'opacity-60')}>
            {f.leaveInMin}
          </span>
        ))}
      </div>
      <div className="tnum w-[5.2rem] shrink-0 text-right leading-none">
        {d.primary ? (
          <>
            <div className={cn('text-[2.4rem] font-bold', d.primary.dep.assigned === false && 'opacity-70')}>{d.primary.leaveInMin === 0 ? 'Go' : d.primary.leaveInMin}</div>
            <div className="mt-0.5 text-[1rem] text-muted-foreground">{clock(d.primary.leaveBy)}</div>
          </>
        ) : d.tooLate ? (
          <div className="text-[1rem] text-muted-foreground">too late<div>{clock(d.tooLate.time!)}</div></div>
        ) : d.atTerminal ? (
          <div className="text-[1rem] text-muted-foreground">at terminal</div>
        ) : (
          <div className="text-[1.4rem] text-muted-foreground">–</div>
        )}
      </div>
    </li>
  );
}

export function TransitCardView({ card, now, stale }: { card: TransitCard; now: number; stale: boolean }) {
  const walk = card.walkMin * 60;
  return (
    <CardShell title={card.title} right={`${card.walkMin} min walk`} stale={stale && card.status === 'ok'}>
      {card.status === 'error' ? (
        <Message>Can&rsquo;t load right now. Retrying.</Message>
      ) : card.rows.length === 0 ? (
        <Message>No departures soon</Message>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {card.rows.map((r) => (
            <DepartureRow key={r.key} row={r} walkSec={walk} now={now} stale={stale} />
          ))}
        </ul>
      )}
    </CardShell>
  );
}

export function BikeCardView({ card, stale }: { card: BikeCard; stale: boolean }) {
  return (
    <CardShell title={card.title} right="live docks" stale={stale && card.status === 'ok'}>
      {card.status === 'error' ? (
        <Message>Can&rsquo;t load right now. Retrying.</Message>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {card.stations.map((s) => {
            const closed = !s.renting ? 'no rentals' : !s.returning ? 'no returns' : null;
            return (
              <li key={s.id} className={cn('flex items-center gap-3 border-t border-border first:border-t-0', ROW_H)}>
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="truncate text-[1.15rem] font-medium">{s.name}</div>
                  <div className={cn('text-[1rem]', closed ? 'font-medium text-bad' : 'text-muted-foreground')}>{closed ?? `${s.capacity} docks`}</div>
                </div>
                <Count label="Classic" value={s.bikes} dim={!s.renting} />
                <Count label="E-bike" value={s.ebikes} dim={!s.renting} />
                <Count label="Docks" value={s.docks} dim={!s.returning} />
              </li>
            );
          })}
        </ul>
      )}
    </CardShell>
  );
}

function Count({ label, value, dim }: { label: string; value: number; dim: boolean }) {
  return (
    <div className={cn('tnum w-[4.2rem] text-center leading-none', dim && 'opacity-40 line-through')}>
      <div className="text-[2rem] font-bold">{value}</div>
      <div className="mt-0.5 text-[1rem] text-muted-foreground">{label}</div>
    </div>
  );
}
