'use client'

import { useEffect, useState } from 'react'
import { AlertStrip } from '@/components/alert-strip'
import { BikeCardView, TransitCardView } from '@/components/transit-card'
import { useBoard, useBurnInShift, useServerNow, useWakeLock } from '@/components/use-board'
import { ageText, freshness } from '@/lib/freshness'
import { clockParts, inQuietHours, longDate } from '@/lib/time'
import { isDaytime } from '@/lib/sun'
import { cn } from '@/lib/utils'
import type { Board, Card } from '@/lib/types'

function useThemeParam(): 'light' | 'dark' | null {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null)
  useEffect(() => {
    const t = new URLSearchParams(location.search).get('theme')
    setTheme(t === 'light' || t === 'dark' ? t : null)
  }, [])
  return theme
}

export function BoardScreen() {
  const override = useThemeParam()
  const [quiet, setQuiet] = useState(false)
  const { board, receivedAt } = useBoard(quiet)
  const now = useServerNow(board, receivedAt)
  const shift = useBurnInShift()
  useWakeLock()

  const isQuiet = board ? inQuietHours(board.quietHours, now) : false
  useEffect(() => setQuiet(isQuiet), [isQuiet])

  const theme = override ?? (board ? (isDaytime(board.sun, now) ? 'light' : 'dark') : 'dark')
  useEffect(() => {
    document.documentElement.dataset.theme = isQuiet ? 'dark' : theme
  }, [theme, isQuiet])

  if (isQuiet) return <div className='fixed inset-0 bg-black' aria-hidden />
  if (!board)
    return <div className='flex h-full items-center justify-center text-[1.4rem] text-muted-foreground'>Loading…</div>
  return <BoardView board={board} now={now} shift={shift} />
}

/** The board itself, drawn from a board and the server time. No fetching, timers or theme handling. */
export function BoardView({
  board,
  now,
  shift = { x: 0, y: 0 },
}: {
  board: Board
  now: number
  shift?: { x: number; y: number }
}) {
  // time since the last good board, as the server's clock sees it
  const boardAge = now - board.now
  const state = freshness(boardAge)
  const time = clockParts(now)
  // as in the mockup: subway and PATH on the wide left, buses and Citi Bike on the right
  const left = board.cards.filter(c => c.kind === 'subway' || c.kind === 'path')
  const right = board.cards.filter(c => c.kind === 'bus' || c.kind === 'citibike')
  const render = (card: Card) => {
    const age = now - (card.updatedAt ?? board.now)
    const stale = state === 'stale' || freshness(age) === 'stale'
    const fit = card.kind === 'path' ? 'flex-none' : 'flex-1'
    return card.kind === 'citibike' ? (
      <BikeCardView key={card.id} card={card} stale={stale} className={fit} />
    ) : (
      <TransitCardView key={card.id} card={card} now={now} stale={stale} className={fit} />
    )
  }
  return (
    <main
      className='flex h-full flex-col gap-[0.6rem] p-[0.8rem]'
      style={{ transform: `translate(${shift.x}px, ${shift.y}px)` }}
    >
      <header className='flex h-[3.4rem] shrink-0 items-center justify-between px-2'>
        <div className='min-w-0'>
          <h1 className='m-0 truncate text-[1.5rem] leading-none font-semibold'>{board.title}</h1>
          <div className='mt-1 text-[1.15rem] text-muted-foreground'>{longDate(now)}</div>
        </div>
        <div className='flex items-center gap-6'>
          <span
            className={cn(
              'text-[1rem]',
              state === 'fresh' && 'text-muted-foreground',
              state === 'amber' && 'font-medium text-warn',
              state === 'stale' && 'font-medium text-bad'
            )}
            data-freshness={state}
          >
            {state === 'stale' ? `data is stale · ${ageText(boardAge)}` : ageText(boardAge)}
          </span>
          <span className='tnum flex items-baseline text-[3.4rem] leading-none font-bold'>
            {time.hm}
            <span className='ml-2 text-[1.6rem] font-normal text-muted-foreground'>:{time.ss}</span>
          </span>
        </div>
      </header>
      <div className='flex min-h-0 flex-1 gap-[0.6rem]'>
        {left.length > 0 && (
          <div className='flex min-h-0 min-w-0 flex-[1.75] flex-col gap-[0.6rem]'>{left.map(render)}</div>
        )}
        {right.length > 0 && (
          <div className='flex min-h-0 min-w-0 flex-1 flex-col gap-[0.6rem]'>{right.map(render)}</div>
        )}
      </div>
      <AlertStrip items={board.alerts.items} error={board.alerts.status === 'error'} />
    </main>
  )
}
