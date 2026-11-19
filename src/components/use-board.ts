'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Board } from '@/lib/types'

const REFRESH_MS = 20_000
const VERSION_MS = 5 * 60_000
const RELOAD_MS = 6 * 3_600_000

/** Server time in epoch seconds, ticking every second. The offset comes from the last board's own clock. */
export function useServerNow(board: Board | null, receivedAt: number | null): number {
  const offset = useRef(0)
  if (board && receivedAt !== null) offset.current = board.now * 1000 - receivedAt
  const [tick, setTick] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return Math.floor((tick + offset.current) / 1000)
}

/**
 * Polls /api/board. A failed refresh keeps the last good board, so the screen goes stale instead of
 * blank. Also reloads the page on a new deploy, and every 6 hours anyway.
 */
export function useBoard(paused: boolean) {
  const [board, setBoard] = useState<Board | null>(null)
  const [receivedAt, setReceivedAt] = useState<number | null>(null)
  const version = useRef<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/board', { cache: 'no-store' })
      if (!res.ok) return
      const data = (await res.json()) as Board
      version.current ??= data.version
      setBoard(data)
      setReceivedAt(Date.now())
    } catch {
      /* offline: keep the last board */
    }
  }, [])

  useEffect(() => {
    if (paused) return
    void load()
    const id = setInterval(() => void load(), REFRESH_MS)
    return () => clearInterval(id)
  }, [load, paused])

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' })
        const { version: v } = (await res.json()) as { version: string }
        if (version.current && v !== version.current) location.reload()
      } catch {
        /* ignore */
      }
    }
    const a = setInterval(() => void check(), VERSION_MS)
    const b = setTimeout(() => location.reload(), RELOAD_MS)
    return () => {
      clearInterval(a)
      clearTimeout(b)
    }
  }, [])

  return { board, receivedAt }
}

/** Keeps the screen awake where the browser allows it. */
export function useWakeLock() {
  useEffect(() => {
    let lock: { release(): Promise<void> } | null = null
    const request = async () => {
      try {
        lock =
          (await (
            navigator as unknown as { wakeLock?: { request(t: 'screen'): Promise<{ release(): Promise<void> }> } }
          ).wakeLock?.request('screen')) ?? null
      } catch {
        /* denied */
      }
    }
    void request()
    const onVisible = () => document.visibilityState === 'visible' && void request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release()
    }
  }, [])
}

/** A 1 to 2 px shift every few minutes, against burn-in. */
export function useBurnInShift(): { x: number; y: number } {
  const [shift, setShift] = useState({ x: 0, y: 0 })
  useEffect(() => {
    const pick = () => Math.floor(Math.random() * 5) - 2
    const id = setInterval(() => setShift({ x: pick(), y: pick() }), 4 * 60_000)
    return () => clearInterval(id)
  }, [])
  return shift
}
