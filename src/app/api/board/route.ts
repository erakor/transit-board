import { NextResponse } from 'next/server'
import { board } from '@/lib/server'

export const dynamic = 'force-dynamic'

const HEADERS = { 'Cache-Control': 'no-store' }

/** One request for the whole screen. Errors say nothing about the setup. */
export async function GET() {
  try {
    return NextResponse.json(await board(), { headers: HEADERS })
  } catch (err) {
    console.error('board failed', err instanceof Error ? err.message : 'unknown')
    return NextResponse.json({ error: 'board unavailable' }, { status: 500, headers: HEADERS })
  }
}
