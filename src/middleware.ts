import { NextResponse, type NextRequest } from 'next/server';
import { checkKey } from '@/lib/auth';

export const config = { matcher: ['/((?!_next/|favicon.ico|api/version).*)'] };

const COOKIE = 'board-key';

/** ?k=<key> once, then a cookie. Without DASHBOARD_KEY the board is open in development and closed in production. */
export function middleware(req: NextRequest) {
  const expected = process.env.DASHBOARD_KEY;
  if (!expected) {
    if (process.env.NODE_ENV !== 'production' || process.env.BOARD_DEMO) return NextResponse.next();
    return new NextResponse('Not configured', { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  const fromQuery = req.nextUrl.searchParams.get('k');
  if (checkKey(fromQuery, expected)) {
    const url = req.nextUrl.clone();
    url.searchParams.delete('k');
    const res = NextResponse.redirect(url);
    res.cookies.set(COOKIE, expected, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 60 * 60 * 24 * 365, path: '/' });
    return res;
  }
  if (checkKey(req.cookies.get(COOKIE)?.value ?? null, expected)) return NextResponse.next();
  return new NextResponse('Unauthorized', { status: 401, headers: { 'Cache-Control': 'no-store' } });
}
