/**
 * Fixed sample data for the stories. Everything is relative to NOW so the countdowns, leave-by
 * times and freshness labels come out the same on every run. Shaped like src/lib/demo.ts.
 */
import type { AlertItem, BikeCard, Board, Bullet, Dep, Row, Station, TransitCard } from '@/lib/types';

/** Sunday, June 21 2026, 12:00 in New York. */
export const NOW = Date.UTC(2026, 5, 21, 16) / 1000;

/** A departure `min` minutes (and `sec` seconds) from NOW. */
export const at = (min: number, sec = 20, extra: Partial<Dep> = {}): Dep => ({ time: NOW + min * 60 + sec, assigned: true, ...extra });

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

// Rows ------------------------------------------------------------------------------------------

export const ROWS = {
  onTime: { key: 'L-N', bullet: BULLETS.L, label: '8 Av', sub: 'Manhattan', deps: [at(11), at(16), at(23), at(31)] },
  stalled: { key: 'L-S', bullet: BULLETS.L, label: 'Canarsie-Rockaway Pkwy', sub: 'Brooklyn', deps: [at(9, 20, { stalled: true }), at(15), at(22)] },
  delayed: { key: 'L-N-delayed', bullet: BULLETS.L, label: '8 Av', sub: 'Manhattan', deps: [at(16, 20, { delayed: true }), at(23), at(31)] },
  notAssigned: { key: 'G-N', bullet: BULLETS.G, label: 'Court Sq', sub: 'Queens', deps: [at(21, 20, { assigned: false }), at(29, 20, { assigned: false })] },
  go: { key: 'G-S', bullet: BULLETS.G, label: 'Church Av', sub: 'Brooklyn', deps: [at(7, 30), at(13), at(20)] },
  tooLate: { key: 'A-S', bullet: BULLETS.A, label: 'Far Rockaway', sub: 'Brooklyn', deps: [at(2)] },
  empty: { key: 'N-N', bullet: BULLETS.N, label: 'Astoria-Ditmars Blvd', sub: 'Queens', deps: [] },
  warn: { key: 'B62-0', bullet: BULLETS.B62, label: 'Downtown Bklyn via Long Island City', warn: true, deps: [at(6, 10, { stopsAway: 3 }), at(14, 10, { stopsAway: 7 })] },
  atStop: { key: 'B32-0', bullet: BULLETS.B32, label: 'Long Island City via Roebling St', deps: [at(3, 10, { stopsAway: 0 }), at(9, 10, { stopsAway: 4 })] },
  cancelled: { key: 'B32-1', bullet: BULLETS.B32, label: 'Long Island City via Roebling St', deps: [at(17, 10, { cancelled: true })] },
  atTerminal: { key: 'B62-1', bullet: BULLETS.B62, label: 'Downtown Bklyn via Long Island City', deps: [{ time: null, atTerminal: true }] },
  path: { key: 'NWK-WTC-NJ', bullet: BULLETS.NWK, label: 'Newark', sub: 'To New Jersey', deps: [at(17), at(19), at(26)] },
} satisfies Record<string, Row>;

// Transit cards ---------------------------------------------------------------------------------

export const SUBWAY_CARD: TransitCard = {
  id: 'subway-0',
  kind: 'subway',
  title: 'Bedford Av',
  walkMin: 4,
  status: 'ok',
  updatedAt: NOW - 12,
  rows: [
    { ...ROWS.onTime, deps: [at(11), at(16, 20, { delayed: true }), at(23, 20, { assigned: false }), at(31, 20, { assigned: false })] },
    { ...ROWS.stalled, deps: [at(3), at(9, 20, { stalled: true }), at(15), at(22)] },
  ],
};

export const SUBWAY_COMPLEX_CARD: TransitCard = {
  id: 'subway-1',
  kind: 'subway',
  title: 'Metropolitan Av / Lorimer St',
  walkMin: 7,
  status: 'ok',
  updatedAt: NOW - 25,
  rows: [
    { ...ROWS.notAssigned, deps: [at(7), at(14), at(21, 20, { assigned: false })] },
    { ...ROWS.go, deps: [at(2), at(13), at(20)] },
  ],
};

export const BUS_CARD: TransitCard = {
  id: 'bus-2',
  kind: 'bus',
  title: 'Berry St / N 8 St',
  walkMin: 3,
  status: 'ok',
  updatedAt: NOW - 8,
  stop: { name: 'Berry St/N 8 St', code: '308209' },
  rows: [
    { ...ROWS.warn, deps: [at(6, 10, { stopsAway: 3 }), at(14, 10, { stopsAway: 7 }), { time: null, atTerminal: true }] },
    { ...ROWS.atStop, deps: [at(9, 10, { stopsAway: 4 }), at(17, 10, { cancelled: true }), at(26, 10, { stopsAway: 13 })] },
  ],
};

export const PATH_CARD: TransitCard = {
  id: 'path-3',
  kind: 'path',
  title: 'PATH · World Trade Center',
  walkMin: 16,
  status: 'ok',
  updatedAt: NOW - 30,
  rows: [
    { key: 'NWK-WTC-NJ', bullet: BULLETS.NWK, label: 'Newark', sub: 'To New Jersey', deps: [at(0, 40), at(19), at(26)] },
    { key: 'HOB-WTC-NJ', bullet: BULLETS.HOB, label: 'Hoboken', sub: 'To New Jersey', deps: [at(22), at(30)] },
  ],
};

// Citi Bike -------------------------------------------------------------------------------------

export const STATIONS = {
  open: { id: 'a', name: 'Berry St & N 8 St', capacity: 39, bikes: 6, ebikes: 8, docks: 25, renting: true, returning: true },
  noReturns: { id: 'b', name: 'Bedford Ave & N 7 St', capacity: 31, bikes: 0, ebikes: 2, docks: 29, renting: true, returning: false },
  noRentals: { id: 'c', name: 'N 6 St & Bedford Ave', capacity: 27, bikes: 4, ebikes: 1, docks: 0, renting: false, returning: true },
  full: { id: 'd', name: 'Kent Ave & N 9 St', capacity: 23, bikes: 15, ebikes: 8, docks: 0, renting: true, returning: true },
  empty: { id: 'e', name: 'Wythe Ave & Metropolitan Ave', capacity: 27, bikes: 0, ebikes: 0, docks: 27, renting: true, returning: true },
} satisfies Record<string, Station>;

export const BIKE_CARD: BikeCard = {
  id: 'citibike-4',
  kind: 'citibike',
  title: 'Citi Bike',
  status: 'ok',
  updatedAt: NOW - 6,
  stations: [STATIONS.open, STATIONS.noReturns],
};

// Alerts ----------------------------------------------------------------------------------------

export const ALERTS: AlertItem[] = [
  { id: 'lmm:alert:1', planned: false, category: 'Delays', header: 'Brooklyn-bound [L] trains are running with delays while we address a signal problem near Bedford Av.', routes: [BULLETS.L] },
  { id: 'lmm:alert:2', planned: true, category: 'Planned - Stops Skipped', header: 'Some [G] trains skip Metropolitan Av this weekend.', routes: [BULLETS.G] },
  { id: 'bus:1', planned: false, category: 'Detour', header: 'B62 buses are detoured around a water main break.', routes: [BULLETS.B62] },
];

// The whole board -------------------------------------------------------------------------------

export const BOARD: Board = {
  now: NOW,
  title: 'Williamsburg · Berry St',
  cards: [SUBWAY_CARD, SUBWAY_COMPLEX_CARD, BUS_CARD, PATH_CARD, BIKE_CARD],
  alerts: { status: 'ok', items: ALERTS },
  sun: { rise: NOW - 6 * 3600, set: NOW + 8 * 3600 },
  quietHours: ['00:30', '06:00'],
  version: 'storybook',
};
