/**
 * Sample data for the stories. The board and its cards come from the real builder run on the demo
 * data (as in test/board.test.ts), so stories show what demo mode shows. The hand-written rows and
 * stations below only cover states the demo data doesn't.
 */
import { buildBoard } from '@/lib/board';
import { EXAMPLE_CONFIG } from '@/lib/config';
import { demoFetcher } from '@/lib/demo';
import { TransitError, type Fetcher } from '@/lib/transit';
import type { BikeCard, Bullet, Dep, Row, Station, TransitCard } from '@/lib/types';

/** Sunday, June 21 2026, 12:00 in New York. */
export const NOW = Date.UTC(2026, 5, 21, 16) / 1000;

const demo = demoFetcher(() => NOW);

/** The demo board, with the calls `fails` matches rejected the way an upstream outage would. */
const demoBoard = (fails: (path: string) => boolean = () => false) => {
  const fetch: Fetcher = (path, params) => (fails(path) ? Promise.reject(new TransitError(502, 'upstream_unavailable')) : demo(path, params));
  return buildBoard(EXAMPLE_CONFIG, fetch, NOW, 'storybook');
};

export const BOARD = await demoBoard();
export const BOARD_PATH_DOWN = await demoBoard((path) => path === '/path/arrivals');
export const BOARD_ALERTS_DOWN = await demoBoard((path) => path.endsWith('/alerts'));

const card = <T>(id: string) => BOARD.cards.find((c) => c.id === id) as T;
export const SUBWAY_CARD = card<TransitCard>('subway-0');
export const SUBWAY_COMPLEX_CARD = card<TransitCard>('subway-1');
export const BUS_CARD = card<TransitCard>('bus-2');
export const PATH_CARD = card<TransitCard>('path-3');
export const BIKE_CARD = card<BikeCard>('citibike-4');
export const ALERTS = BOARD.alerts.items;

// Edge cases the demo data doesn't cover --------------------------------------------------------

/** A departure `min` minutes (and `sec` seconds) from NOW. */
const at = (min: number, sec = 20, extra: Partial<Dep> = {}): Dep => ({ time: NOW + min * 60 + sec, assigned: true, ...extra });

export const BULLETS = {
  L: { name: 'L', color: '#7C858C', textColor: '#FFFFFF' },
  G: { name: 'G', color: '#6CBE45', textColor: '#FFFFFF' },
  A: { name: 'A', color: '#0039A6', textColor: '#FFFFFF' },
  N: { name: 'N', color: '#FCCC0A', textColor: '#000000' },
  SIR: { name: 'SIR', color: '#0039A6', textColor: '#FFFFFF' },
  B62: { name: 'B62', color: '#6CBE45', textColor: '#FFFFFF' },
  B32: { name: 'B32', color: '#00A1DE', textColor: '#FFFFFF' },
  NWK: { name: 'NWK-WTC', color: '#D93A30', textColor: '#FFFFFF' },
  HOB: { name: 'HOB-WTC', color: '#4D92FB', textColor: '#FFFFFF' },
} satisfies Record<string, Bullet>;

const manhattan = { key: 'L-N', bullet: BULLETS.L, label: '8 Av', sub: 'Manhattan' };
const b62 = { key: 'B62|Downtown Bklyn via Long Island City', bullet: BULLETS.B62, label: 'Downtown Bklyn via Long Island City' };
const b32 = { key: 'B32|Long Island City via Roebling St', bullet: BULLETS.B32, label: 'Long Island City via Roebling St' };

/** One row per state, for a 4 min walk unless the story says otherwise. */
export const ROWS = {
  onTime: { ...manhattan, deps: [at(11), at(16), at(23), at(31)] },
  delayed: { ...manhattan, deps: [at(16, 20, { delayed: true }), at(23), at(31)] },
  stalled: { key: 'L-S', bullet: BULLETS.L, label: 'Canarsie-Rockaway Pkwy', sub: 'Brooklyn', deps: [at(9, 20, { stalled: true }), at(15), at(22)] },
  notAssigned: { key: 'G-N', bullet: BULLETS.G, label: 'Court Sq', sub: 'Queens', deps: [at(21, 20, { assigned: false }), at(29, 20, { assigned: false })] },
  go: { key: 'G-S', bullet: BULLETS.G, label: 'Church Av', sub: 'Brooklyn', deps: [at(7, 30), at(13), at(20)] },
  tooLate: { key: 'A-S', bullet: BULLETS.A, label: 'Far Rockaway', sub: 'Brooklyn', deps: [at(2)] },
  empty: { key: 'N-N', bullet: BULLETS.N, label: 'Astoria-Ditmars Blvd', sub: 'Queens', deps: [] },
  busWithAlert: { ...b62, warn: true, deps: [at(6, 10, { stopsAway: 3 }), at(14, 10, { stopsAway: 7 })] },
  busAtStop: { ...b32, deps: [at(3, 10, { stopsAway: 0 }), at(9, 10, { stopsAway: 4 })] },
  busCancelled: { ...b32, deps: [at(17, 10, { cancelled: true })] },
  busAtTerminal: { ...b62, deps: [{ time: null, atTerminal: true }] },
  path: { key: 'NWK-WTC-NJ', bullet: BULLETS.NWK, label: 'Newark', sub: 'To New Jersey', deps: [at(17), at(19), at(26)] },
} satisfies Record<string, Row>;

export const STATIONS = {
  noReturns: { id: 'b', name: 'Bedford Ave & N 7 St', capacity: 31, bikes: 0, ebikes: 2, docks: 29, renting: true, returning: false },
  noRentals: { id: 'c', name: 'N 6 St & Bedford Ave', capacity: 27, bikes: 4, ebikes: 1, docks: 0, renting: false, returning: true },
  full: { id: 'd', name: 'Kent Ave & N 9 St', capacity: 23, bikes: 15, ebikes: 8, docks: 0, renting: true, returning: true },
  empty: { id: 'e', name: 'Wythe Ave & Metropolitan Ave', capacity: 27, bikes: 0, ebikes: 0, docks: 27, renting: true, returning: true },
} satisfies Record<string, Station>;
