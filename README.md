# transit-board

A full-screen, hands-off wall display: when to leave for the subway, nearby buses, PATH, Citi Bike docks and live alerts.
Nobody touches it. It is a small Next.js app (App Router, Tailwind v4, shadcn-style components) on top of the
[`transit`](https://github.com/erakor/transit) API, which it does not change.

## How it works

```
Chromium kiosk -- GET /api/board every 20 s --> transit-board (Vercel)
                                                  middleware: ?k=<key> then a cookie
                                                  /api/board: calls transit in parallel, returns one board
                                                  env: TRANSIT_TOKEN stays on the server
```

- **One request per refresh.** `src/lib/board.ts` fans out with `Promise.allSettled`; a failing panel becomes an error card and the rest of the screen stays normal.
- **Leave-in rule** (`src/lib/leave.ts`): the big number is the minutes until you must leave for the first train you can still catch (`time - walk`). Following trains sit to its left, the leave-by time under it. Trains you can't reach are dropped; if none can be reached the row says "too late". Countdowns tick every second in the browser from epoch times, on the server's clock.
- **Theme** is light between sunrise and sunset (computed from the configured location, which never leaves the server), dark otherwise. `?theme=light|dark` overrides it. The screen goes black during `quietHours`.
- **Reliability:** "updated N s ago" turns amber after 60 s and the data greys out after 3 min; the last good board is kept when a refresh fails; the page reloads when `/api/version` changes and every 6 h; the layout shifts 1 to 2 px every few minutes; a Wake Lock keeps the screen on.
- Text is at least 1 rem, and 1 rem is 1/45 of the screen height (24 px at 1080p).

## Setup

Environment variables (Vercel, never the repo; see `.env.example`):

| Variable | |
| --- | --- |
| `TRANSIT_BASE_URL` | the transit deployment |
| `TRANSIT_TOKEN` | a dedicated token (also add it to transit's comma-separated list so it can be revoked alone) |
| `DASHBOARD_KEY` | open the board once with `?k=<key>`; a cookie keeps it. Without it the board answers 503 in production |
| `BOARD_CONFIG` | JSON settings, shape in `src/lib/config.ts` (required in production) |
| `BOARD_DEMO` | `1` serves generated sample data instead of calling transit |

`EXAMPLE_CONFIG` in `src/lib/config.ts` shows the shape with example values. Look up the real ids with transit's
`/stops/search`, `/bus/nearby` and `/citibike/nearby`. **`G29+L10` is unchecked.**

## Commands

```sh
pnpm dev          # BOARD_DEMO=1 pnpm dev to run without transit
pnpm test         # vitest
pnpm typecheck
pnpm build
pnpm gen:types    # TRANSIT_OPENAPI=../transit/public/openapi.json pnpm gen:types
pnpm screenshots  # 1080p and 4K, light and dark, against a running demo server
pnpm storybook    # every board component and its states, on fixed sample data (src/stories/fixtures.ts)
```

## Wall

Raspberry Pi 5 with Chromium in kiosk mode, `unclutter` for the cursor, `cec-ctl` from cron for the TV:

```sh
chromium --kiosk --noerrdialogs --disable-session-crashed-bubble --incognito "https://board.example/?k=<key>"
```

## Status

Built and tested against sample data shaped like the API (`src/lib/demo.ts`), not recorded responses: the build
session had no access to a transit deployment. Re-record real JSON as test data once one is reachable.
Later: weather, LIRR/Metro-North, bus positions.
