import 'server-only'
import { buildBoard } from './board'
import { loadConfig } from './config'
import { demoFetcher } from './demo'
import { transitFetcher, type Fetcher } from './transit'
import type { Board } from './types'

export function currentVersion(): string {
  return process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.VERCEL_DEPLOYMENT_ID ?? 'dev'
}

export function makeFetcher(
  env: Record<string, string | undefined> = process.env,
  now: () => number = () => Math.floor(Date.now() / 1000)
): Fetcher {
  if (env.BOARD_DEMO) return demoFetcher(now)
  const base = env.TRANSIT_BASE_URL
  const token = env.TRANSIT_TOKEN
  if (!base || !token) throw new Error('TRANSIT_BASE_URL and TRANSIT_TOKEN must be set')
  return transitFetcher(base, token)
}

export async function board(env: Record<string, string | undefined> = process.env): Promise<Board> {
  const now = Math.floor(Date.now() / 1000)
  return buildBoard(
    loadConfig(env),
    makeFetcher(env, () => now),
    now,
    currentVersion()
  )
}
