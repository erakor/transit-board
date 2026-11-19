import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/** The screen polls this and reloads itself when a new deploy changes it. */
export function GET() {
  return NextResponse.json(
    { version: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.VERCEL_DEPLOYMENT_ID ?? 'dev' },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
