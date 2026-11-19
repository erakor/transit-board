import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RouteBullet, RouteChip } from '@/components/bullet'
import { clock } from '@/lib/time'
import { pickDepartures } from '@/lib/leave'
import { cn } from '@/lib/utils'
import type { BikeCard, Row, RowAlert, TransitCard } from '@/lib/types'

const TAG: Record<string, string> = { subway: 'Subway', path: 'PATH' }

function Walk({ min }: { min: number }) {
  return (
    <span className='inline-flex items-center gap-1.5 text-[1rem] text-muted-foreground'>
      <svg
        viewBox='0 0 24 24'
        className='h-[1.1rem] w-[1.1rem]'
        fill='none'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
        aria-hidden
      >
        <circle cx='13' cy='4' r='1.6' />
        <path d='M9 21l2.5-6-2-3 1.5-4 3 3 3 1M11.5 15l3 2 .5 4M10 8l-3 3' />
      </svg>
      {min} min walk
    </span>
  )
}

/** Next to a row's label: amber for incidents (delays, suspensions), muted for planned work. */
function AlertTag({ alert }: { alert: RowAlert }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 text-[1rem] font-medium',
        alert.planned ? 'text-muted-foreground' : 'text-warn'
      )}
    >
      <svg
        viewBox='0 0 24 24'
        className='h-[1.05rem] w-[1.05rem]'
        fill='none'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
        aria-hidden
      >
        <path d='M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01' />
      </svg>
      {alert.label}
    </span>
  )
}

function Message({ children }: { children: React.ReactNode }) {
  return <div className='flex flex-1 items-center justify-center text-[1.15rem] text-muted-foreground'>{children}</div>
}

function CardShell({
  title,
  tag,
  right,
  stale,
  className,
  children,
}: {
  title: string
  tag?: string
  right?: React.ReactNode
  stale: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className='flex min-w-0 items-baseline gap-3'>
          <CardTitle>{title}</CardTitle>
          {tag && <span className='shrink-0 text-[1rem] text-muted-foreground'>{tag}</span>}
        </div>
        {right}
      </CardHeader>
      <CardContent className={cn(stale && 'opacity-60 grayscale')}>{children}</CardContent>
    </Card>
  )
}

function Minutes({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn('tnum', className)}>
      {value}
      <span className='text-[1rem] font-normal text-muted-foreground'>m</span>
    </span>
  )
}

/** Same layout in every transit card: the following trains on the left, the big leave-in number on the right. */
function Following({ values, dimmed }: { values: Array<{ min: number; tentative: boolean }>; dimmed?: boolean }) {
  return (
    <div
      className={cn('tnum flex shrink-0 gap-3 text-[1.3rem] font-medium text-muted-foreground', dimmed && 'opacity-60')}
      aria-label='following trains'
    >
      {values.map((f, i) => (
        <Minutes key={i} value={f.min} className={cn(f.tentative && 'opacity-60')} />
      ))}
    </div>
  )
}

function BigNumber({ d, compact }: { d: ReturnType<typeof pickDepartures>; compact?: boolean }) {
  if (compact && d.primary)
    return (
      <div className='tnum flex w-[10rem] shrink-0 items-baseline justify-end gap-1.5 leading-none'>
        <span className='text-[1.15rem] text-muted-foreground'>{clock(d.primary.leaveBy)}</span>
        <span className='text-[2rem] font-bold'>{d.primary.leaveInMin === 0 ? 'Go' : d.primary.leaveInMin}</span>
        {d.primary.leaveInMin !== 0 && <span className='text-[1.15rem] text-muted-foreground'>min</span>}
      </div>
    )
  return (
    <div className='tnum w-[7rem] shrink-0 text-right leading-none'>
      {d.primary ? (
        <>
          <div
            className={cn('flex items-baseline justify-end gap-1', d.primary.dep.assigned === false && 'opacity-70')}
          >
            <span className='text-[2.7rem] font-bold'>{d.primary.leaveInMin === 0 ? 'Go' : d.primary.leaveInMin}</span>
            {d.primary.leaveInMin !== 0 && <span className='text-[1.15rem] text-muted-foreground'>min</span>}
          </div>
          <div className='mt-0.5 text-[1rem] text-muted-foreground'>{clock(d.primary.leaveBy)}</div>
        </>
      ) : d.tooLate ? (
        <div className='text-[1rem] leading-tight text-muted-foreground'>
          too late
          <div>{clock(d.tooLate.time!)}</div>
        </div>
      ) : d.atTerminal ? (
        <div className='text-[1rem] text-muted-foreground'>at terminal</div>
      ) : (
        <div className='text-[1.4rem] text-muted-foreground'>–</div>
      )}
    </div>
  )
}

function statusLine(row: Row, d: ReturnType<typeof pickDepartures>): { text: React.ReactNode; warn: boolean } {
  const dep = d.primary?.dep
  if (d.cancelled && !d.primary)
    return {
      text: (
        <span>
          <s>{clock(d.cancelled.time!)}</s> cancelled
        </span>
      ),
      warn: true,
    }
  if (dep?.stalled) return { text: 'stalled', warn: true }
  if (dep?.assigned === false) return { text: 'not yet assigned', warn: false }
  if (dep?.delayed) return { text: 'delayed', warn: true }
  const stops = dep?.stopsAway
  if (stops !== undefined && stops !== null)
    return { text: stops === 0 ? 'at stop' : `${stops} stop${stops === 1 ? '' : 's'} away`, warn: false }
  return { text: row.sub ?? '', warn: false }
}

const followingOf = (d: ReturnType<typeof pickDepartures>) =>
  d.following.map(f => ({ min: f.leaveInMin, tentative: f.dep.assigned === false }))

/** `alertBelow` puts the alert tag on the second line, for narrow cards where it would crowd the label. */
function DepartureRow({
  row,
  walkSec,
  now,
  compact,
  alertBelow,
}: {
  row: Row
  walkSec: number
  now: number
  compact?: boolean
  alertBelow?: boolean
}) {
  const d = pickDepartures(row.deps, walkSec, now)
  const s = statusLine(row, d)
  return (
    <li
      className={cn(
        'flex items-center gap-4 border-t border-border first:border-t-0',
        compact ? 'h-[3.1rem]' : 'h-[4.4rem]'
      )}
      data-row={row.key}
    >
      {row.bullet &&
        (row.bullet.name.length > 2 ? <RouteChip route={row.bullet} /> : <RouteBullet route={row.bullet} />)}
      <div className='min-w-0 flex-1 leading-tight'>
        <div className='flex items-center gap-2'>
          <span className='truncate text-[1.25rem] font-medium'>{row.label}</span>
          {row.alert && !alertBelow && <AlertTag alert={row.alert} />}
        </div>
        {!compact && (
          <div className='flex min-w-0 items-center gap-2 text-[1rem]'>
            {row.alert && alertBelow && <AlertTag alert={row.alert} />}
            <span className={cn('truncate', s.warn ? 'text-warn' : 'text-muted-foreground')}>{s.text}</span>
          </div>
        )}
      </div>
      <Following values={followingOf(d)} />
      <BigNumber d={d} compact={compact} />
    </li>
  )
}

export function TransitCardView({
  card,
  now,
  stale,
  className,
}: {
  card: TransitCard
  now: number
  stale: boolean
  className?: string
}) {
  const walk = card.walkMin * 60
  return (
    <CardShell
      title={card.title}
      tag={TAG[card.kind]}
      right={<Walk min={card.walkMin} />}
      stale={stale && card.status === 'ok'}
      className={className}
    >
      {card.status === 'error' ? (
        <Message>Can&rsquo;t load right now. Retrying.</Message>
      ) : (
        <>
          {card.stop && (
            <div className='flex h-[1.9rem] items-center justify-between text-[1rem] text-muted-foreground'>
              <span className='truncate'>{card.stop.name}</span>
              <span className='tnum shrink-0'>#{card.stop.code}</span>
            </div>
          )}
          {card.rows.length === 0 ? (
            <Message>No departures soon</Message>
          ) : (
            <ul className='m-0 flex list-none flex-col p-0'>
              {card.rows.map(r => (
                <DepartureRow
                  key={r.key}
                  row={r}
                  walkSec={walk}
                  now={now}
                  compact={card.kind === 'path'}
                  alertBelow={card.kind === 'bus'}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </CardShell>
  )
}

export function BikeCardView({ card, stale, className }: { card: BikeCard; stale: boolean; className?: string }) {
  return (
    <CardShell
      title={card.title}
      right={<span className='text-[1rem] text-muted-foreground'>Live availability</span>}
      stale={stale && card.status === 'ok'}
      className={className}
    >
      {card.status === 'error' ? (
        <Message>Can&rsquo;t load right now. Retrying.</Message>
      ) : (
        <ul className='m-0 flex list-none flex-col p-0'>
          {card.stations.map(s => {
            const closed = !s.renting ? 'no rentals' : !s.returning ? 'no returns' : null
            return (
              <li
                key={s.id}
                className='flex h-[6.2rem] flex-col justify-center gap-1.5 border-t border-border first:border-t-0'
              >
                <div className='flex items-baseline justify-between gap-3'>
                  <span className='truncate text-[1.25rem] font-medium'>{s.name}</span>
                  {closed && <span className='shrink-0 text-[1rem] font-medium text-bad'>{closed}</span>}
                </div>
                <div className='grid grid-cols-3 items-end'>
                  <Stat label='Classic' value={s.bikes} dim={!s.renting} />
                  <Stat label='E-Bike' icon={<Bolt />} value={s.ebikes} dim={!s.renting} color='text-sky-500' />
                  <Stat label='Docks' value={s.docks} dim={!s.returning} color='text-ok' align='right' />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </CardShell>
  )
}

function Bolt() {
  return (
    <svg
      viewBox='0 0 24 24'
      className='h-[0.95rem] w-[0.95rem]'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden
    >
      <path d='M13 2L4 14h7l-1 8 9-12h-7l1-8z' />
    </svg>
  )
}

function Stat({
  label,
  icon,
  value,
  dim,
  color,
  align,
}: {
  label: string
  icon?: React.ReactNode
  value: number
  dim: boolean
  color?: string
  align?: 'right'
}) {
  return (
    <div className={cn('tnum leading-none', align === 'right' && 'text-right', dim && 'line-through opacity-40')}>
      <div
        className={cn(
          'flex h-[1rem] items-center gap-1 text-[0.9rem] font-medium tracking-wider uppercase',
          align === 'right' && 'justify-end',
          icon ? color : 'text-muted-foreground'
        )}
      >
        {icon}
        {label}
      </div>
      <div className={cn('mt-1 text-[2.2rem] font-bold', color)}>{value}</div>
    </div>
  )
}
