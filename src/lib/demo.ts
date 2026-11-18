import { TransitError, type Fetcher } from './transit';

/** The reference time the tests and stories use: Sunday, June 21 2026, 12:00 in New York. */
export const DEMO_NOW = Date.UTC(2026, 5, 21, 16) / 1000;

/** `fetch`, with the calls `fails` matches rejected the way an upstream outage would. */
export function failingFetcher(fetch: Fetcher, fails: (path: string) => boolean): Fetcher {
  return (path, params) => (fails(path) ? Promise.reject(new TransitError(502, 'upstream_unavailable')) : fetch(path, params));
}

const L = { color: '#7C858C', textColor: '#FFFFFF' };
const G = { color: '#6CBE45', textColor: '#FFFFFF' };

/**
 * Sample answers shaped like transit's, relative to `now`: they cover the states the screen has to
 * handle (unassigned and stalled trains, a terminal bus, a cancelled bus, a closed station).
 * Used by BOARD_DEMO, the screenshots and the tests. Not recorded from the live API.
 */
export function demoFetcher(now: () => number): Fetcher {
  const t = (min: number, sec = 0) => now() + min * 60 + sec;
  const train = (min: number, extra: object = {}) => ({ time: t(min, 20), headsign: '', tripId: `T${min}`, assigned: true, change: null, stalled: false, delayed: false, ...extra });
  return async (path, params = {}) => {
    switch (path) {
      case '/subway/arrivals': {
        if (params.stop === 'L08')
          return {
            stop: { id: 'L08', name: 'Bedford Av', stops: ['L08'] },
            updatedAt: now() - 12,
            groups: [
              { route: 'L', name: 'L', ...L, direction: 'N', headsign: '8 Av', arrivals: [train(11, { headsign: '8 Av' }), train(16, { headsign: '8 Av', delayed: true }), train(23, { headsign: '8 Av', assigned: false }), train(31, { headsign: '8 Av', assigned: false })] },
              { route: 'L', name: 'L', ...L, direction: 'S', headsign: 'Canarsie-Rockaway Pkwy', arrivals: [train(3, { headsign: 'Canarsie' }), train(9, { headsign: 'Canarsie', stalled: true }), train(15, { headsign: 'Canarsie' }), train(22, { headsign: 'Canarsie' })] },
            ],
          };
        if (params.stop === 'G29+L10')
          return {
            stop: { id: 'G29+L10', name: 'Metropolitan Av / Lorimer St', stops: ['G29', 'L10'] },
            updatedAt: now() - 25,
            groups: [
              { route: 'G', name: 'G', ...G, direction: 'N', headsign: 'Court Sq', arrivals: [train(7, { headsign: 'Court Sq' }), train(14, { headsign: 'Court Sq' }), train(21, { headsign: 'Court Sq', assigned: false })] },
              { route: 'G', name: 'G', ...G, direction: 'S', headsign: 'Church Av', arrivals: [train(2, { headsign: 'Church Av' }), train(13, { headsign: 'Church Av' }), train(20, { headsign: 'Church Av' })] },
            ],
          };
        throw new TransitError(404, 'unknown_stop');
      }
      case '/bus/arrivals': {
        const bus = (name: string, color: string, headsign: string, min: number | null, extra: object = {}) => ({
          time: min === null ? null : t(min, 10), route: name, name, color, textColor: '#FFFFFF', headsign, distance: '', stopsAway: min === null ? null : Math.max(0, Math.round(min / 2)), meters: null, atTerminal: min === null, cancelled: false, vehicle: '1', tripId: `${name}${min}`, ...extra,
        });
        return {
          stop: { id: '308209', name: 'BERRY ST/N 8 ST' },
          updatedAt: now() - 8,
          arrivals: [
            bus('B62', '#6CBE45', 'DOWNTOWN BKLYN via LONG ISLAND CITY', 6),
            bus('B32', '#00A1DE', 'LONG ISLAND CITY via ROEBLING ST', 9),
            bus('B62', '#6CBE45', 'DOWNTOWN BKLYN via LONG ISLAND CITY', 14),
            bus('B32', '#00A1DE', 'LONG ISLAND CITY via ROEBLING ST', 17, { cancelled: true }),
            bus('B32', '#00A1DE', 'LONG ISLAND CITY via ROEBLING ST', 26),
            bus('B62', '#6CBE45', 'DOWNTOWN BKLYN via LONG ISLAND CITY', null),
          ],
        };
      }
      case '/path/arrivals':
        return {
          station: { id: 'WTC', name: 'World Trade Center' },
          updatedAt: now() - 30,
          groups: [
            { route: 'NWK-WTC', name: 'Newark - World Trade Center', color: '#D93A30', textColor: '#FFFFFF', direction: 'NJ', headsign: 'Newark', arrivals: [{ time: t(0, 40), headsign: 'Newark' }, { time: t(19), headsign: 'Newark' }, { time: t(26), headsign: 'Newark' }] },
            { route: 'HOB-WTC', name: 'Hoboken - World Trade Center', color: '#4D92FB', textColor: '#FFFFFF', direction: 'NJ', headsign: 'Hoboken', arrivals: [{ time: t(22), headsign: 'Hoboken' }, { time: t(30), headsign: 'Hoboken' }] },
          ],
        };
      case '/citibike/nearby':
        return {
          lat: params.lat, lon: params.lon, updatedAt: now() - 6,
          stations: [
            { id: 'a', name: 'Berry St & N 8 St', lat: 0, lon: 0, capacity: 39, bikes: 6, ebikes: 8, docks: 25, renting: true, returning: true, distance: 80 },
            { id: 'b', name: 'Bedford Ave & N 7 St', lat: 0, lon: 0, capacity: 31, bikes: 0, ebikes: 2, docks: 29, renting: true, returning: false, distance: 190 },
            { id: 'c', name: 'N 6 St & Bedford Ave', lat: 0, lon: 0, capacity: 27, bikes: 4, ebikes: 1, docks: 0, renting: false, returning: true, distance: 260 },
          ].slice(0, Number(params.n ?? 3)),
        };
      case '/subway/alerts':
        return {
          updatedAt: now() - 40,
          alerts: [
            { id: 'lmm:alert:1', planned: false, category: 'Delays', priority: 26, header: 'Brooklyn-bound [L] trains are running with delays while we address a signal problem near Bedford Av.', description: '', routes: [{ id: 'L', name: 'L', ...L }], stops: [], start: now() - 600, end: null },
            { id: 'lmm:alert:2', planned: true, category: 'Planned - Stops Skipped', priority: 12, header: 'Some [G] trains skip Metropolitan Av this weekend.', description: '', routes: [{ id: 'G', name: 'G', ...G }], stops: [], start: now() - 600, end: null },
          ],
        };
      case '/bus/alerts':
        return { updatedAt: now() - 40, alerts: params.route === 'B62' ? [{ id: 'bus:1', planned: false, category: 'Detour', priority: 15, header: 'B62 buses are detoured around a water main break.', description: '', routes: [{ id: 'B62', name: 'B62', ...G }], stops: [], start: now() - 600, end: null }] : [] };
      default:
        throw new TransitError(404, 'not_found');
    }
  };
}
