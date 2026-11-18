import { describe, expect, it } from 'vitest';
import { buildBoard, groupBuses, mergeAlerts, rowAlert, subwayRowAlerts } from '@/lib/board';
import { EXAMPLE_CONFIG, boardConfigSchema, loadConfig } from '@/lib/config';
import { demoFetcher } from '@/lib/demo';
import { TransitError, transitFetcher, type Fetcher } from '@/lib/transit';
import { checkKey } from '@/lib/auth';
import type { BikeCard, TransitCard } from '@/lib/types';

const NOW = Date.UTC(2026, 5, 21, 16) / 1000;
const demo = demoFetcher(() => NOW);

describe('buildBoard', () => {
  it('builds every card from the sample answers', async () => {
    const board = await buildBoard(EXAMPLE_CONFIG, demo, NOW, 'v1');
    expect(board.cards.map((c) => c.id)).toEqual(['subway-0', 'subway-1', 'bus-2', 'path-3', 'citibike-4']);
    expect(board.cards.every((c) => c.status === 'ok')).toBe(true);
    expect(board.sun).not.toBeNull();
    expect(board.version).toBe('v1');
  });

  it('puts the configured direction names next to the headsigns', async () => {
    const board = await buildBoard(EXAMPLE_CONFIG, demo, NOW, 'v');
    const l = board.cards[0] as TransitCard;
    expect(l.rows.map((r) => [r.label, r.sub])).toEqual([['8 Av', 'Manhattan'], ['Canarsie-Rockaway Pkwy', 'Brooklyn']]);
    expect(l.rows[0]!.bullet).toEqual({ name: 'L', color: '#7C858C', textColor: '#FFFFFF' });
  });

  it('keeps the rest of the screen when one panel fails', async () => {
    const flaky: Fetcher = (path, params) => (path === '/path/arrivals' ? Promise.reject(new TransitError(502, 'upstream_unavailable')) : demo(path, params));
    const board = await buildBoard(EXAMPLE_CONFIG, flaky, NOW, 'v');
    const path = board.cards.find((c) => c.kind === 'path')!;
    expect(path.status).toBe('error');
    expect(board.cards.filter((c) => c.status === 'ok')).toHaveLength(4);
  });

  it('tags bus rows whose route has an alert', async () => {
    const board = await buildBoard(EXAMPLE_CONFIG, demo, NOW, 'v');
    const bus = board.cards.find((c) => c.kind === 'bus') as TransitCard;
    expect(bus.rows.find((r) => r.key.startsWith('B62'))!.alert).toEqual({ label: 'Detour', planned: false });
    expect(bus.rows.find((r) => r.key.startsWith('B32'))!.alert).toBeUndefined();
  });

  it('tags subway rows on the route and direction an alert names', async () => {
    const board = await buildBoard(EXAMPLE_CONFIG, demo, NOW, 'v');
    const [l, g] = board.cards as TransitCard[];
    // Brooklyn-bound delays at Bedford Av: the southbound row only
    expect(l!.rows.map((r) => [r.key, r.alert])).toEqual([['L-N', undefined], ['L-S', { label: 'Delays', planned: false }]]);
    // planned work at Metropolitan Av in both directions, without the "Planned - " prefix
    expect(g!.rows.map((r) => r.alert)).toEqual([{ label: 'Stops Skipped', planned: true }, { label: 'Stops Skipped', planned: true }]);
  });

  it('tags subway rows even without an alerts panel', async () => {
    const cfg = boardConfigSchema.parse({ ...EXAMPLE_CONFIG, panels: [{ kind: 'subway', stop: 'L08', walkMin: 4 }] });
    const board = await buildBoard(cfg, demo, NOW, 'v');
    expect((board.cards[0] as TransitCard).rows[1]!.alert?.label).toBe('Delays');
    expect(board.alerts).toEqual({ status: 'ok', items: [] });
  });

  it('sends only as many rows as the card holds', async () => {
    const cfg = boardConfigSchema.parse({ ...EXAMPLE_CONFIG, panels: [{ kind: 'subway', stop: 'L08', walkMin: 4, maxRows: 1 }] });
    const board = await buildBoard(cfg, demo, NOW, 'v');
    expect((board.cards[0] as TransitCard).rows).toHaveLength(1);
  });

  it('reports alerts as an error only when every call failed', async () => {
    const down: Fetcher = (path, params) => (path.endsWith('/alerts') ? Promise.reject(new TransitError(502, 'x')) : demo(path, params));
    const board = await buildBoard(EXAMPLE_CONFIG, down, NOW, 'v');
    expect(board.alerts.status).toBe('error');
    expect(board.cards).toHaveLength(5);
  });

  it('reads Citi Bike closures', async () => {
    const three = boardConfigSchema.parse({ ...EXAMPLE_CONFIG, panels: [{ kind: 'citibike', count: 3 }] });
    const board = await buildBoard(three, demo, NOW, 'v');
    const bikes = board.cards.find((c) => c.kind === 'citibike') as BikeCard;
    expect(bikes.stations.map((s) => [s.renting, s.returning])).toEqual([[true, true], [true, false], [false, true]]);
  });

  it('rounds coordinates so the CDN cache is shared', async () => {
    const calls: Array<[string, Record<string, string | number> | undefined]> = [];
    const spy: Fetcher = (p, params) => (calls.push([p, params]), demo(p, params));
    await buildBoard(EXAMPLE_CONFIG, spy, NOW, 'v');
    expect(calls.find(([p]) => p === '/citibike/nearby')![1]).toMatchObject({ lat: 40.7172, lon: -73.9569 });
  });
});

describe('groupBuses', () => {
  it('groups the flat list by route and title-cased headsign', async () => {
    const res = (await demo('/bus/arrivals', { stop: '308209' })) as { arrivals: Parameters<typeof groupBuses>[0] };
    const rows = groupBuses(res.arrivals);
    expect(rows.map((r) => r.label)).toEqual(['Downtown Bklyn via Long Island City', 'Long Island City via Roebling St']);
    expect(rows[0]!.deps).toHaveLength(3);
    expect(rows[0]!.deps.at(-1)).toMatchObject({ time: null, atTerminal: true });
    expect(rows[1]!.deps.some((d) => d.cancelled)).toBe(true);
  });
});

describe('mergeAlerts', () => {
  it('drops duplicates and lists incidents before planned work', () => {
    const a = (id: string, planned: boolean, priority: number) => ({ id, planned, priority, category: 'x', header: id, description: '', routes: [], stops: [], start: 0, end: null });
    const merged = mergeAlerts([{ updatedAt: 0, alerts: [a('p', true, 30), a('i1', false, 10)] }, { updatedAt: 0, alerts: [a('i1', false, 10), a('i2', false, 20)] }], 5);
    expect(merged.map((m) => m.id)).toEqual(['i2', 'i1', 'p']);
  });
});

describe('row alerts', () => {
  const a = (id: string, planned: boolean, priority: number | null, category: string | null, stops: Array<{ id: string; direction: 'N' | 'S' | null }> = []) => ({
    id, planned, priority, category, header: id, description: '', routes: [{ id: 'G', name: 'G', color: '', textColor: '' }], stops: stops.map((s) => ({ ...s, name: s.id })), start: 0, end: null,
  });
  it('picks incidents over planned work, then the most serious', () => {
    expect(rowAlert([a('p', true, 30, 'Planned - Suspended'), a('d', false, 26, 'Delays'), a('s', false, 33, 'Part Suspended')])).toEqual({ label: 'Part Suspended', planned: false });
    expect(rowAlert([a('f', true, null, null)])).toEqual({ label: 'Planned work', planned: true });
    expect(rowAlert([])).toBeUndefined();
  });
  it('keeps alerts for other stations and drops the other direction here', () => {
    const alerts = [a('elsewhere', false, 26, 'Delays', [{ id: 'G22', direction: 'S' }]), a('north', false, 26, 'Delays', [{ id: 'G29', direction: 'N' }])];
    expect(subwayRowAlerts(alerts, 'G', 'S', ['G29', 'L10']).map((x) => x.id)).toEqual(['elsewhere']);
    expect(subwayRowAlerts(alerts, 'G', 'N', ['G29', 'L10']).map((x) => x.id)).toEqual(['elsewhere', 'north']);
    expect(subwayRowAlerts(alerts, 'L', 'N', ['G29', 'L10'])).toEqual([]);
  });
});

describe('config', () => {
  it('requires BOARD_CONFIG in production but not in development or demo', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow('BOARD_CONFIG is not set');
    expect(loadConfig({ NODE_ENV: 'production', BOARD_DEMO: '1' })).toEqual(EXAMPLE_CONFIG);
    expect(loadConfig({ NODE_ENV: 'development' })).toEqual(EXAMPLE_CONFIG);
  });
  it('explains what is wrong without echoing values', () => {
    expect(() => loadConfig({ BOARD_CONFIG: '{"title":""}' })).toThrow(/BOARD_CONFIG is invalid/);
    expect(() => loadConfig({ BOARD_CONFIG: 'nope' })).toThrow('not valid JSON');
  });
  it('accepts a full config as JSON', () => {
    expect(loadConfig({ BOARD_CONFIG: JSON.stringify(EXAMPLE_CONFIG) })).toEqual(EXAMPLE_CONFIG);
  });
});

describe('transit client', () => {
  it('sends the token in X-Transit-Token and nothing in Authorization', async () => {
    let seen: Request | undefined;
    const fake = (async (url: URL, init: RequestInit) => ((seen = new Request(url, init)), Response.json({ ok: 1 }))) as unknown as typeof fetch;
    await transitFetcher('https://t.example/', 'secret', fake)('/subway/arrivals', { stop: 'L08' });
    expect(seen!.headers.get('x-transit-token')).toBe('secret');
    expect(seen!.headers.get('authorization')).toBeNull();
    expect(seen!.url).toBe('https://t.example/subway/arrivals?stop=L08');
  });
  it('turns failures into errors that carry no URL or token', async () => {
    const fake = (async () => Response.json({ error: 'x', code: 'upstream_unavailable' }, { status: 502 })) as unknown as typeof fetch;
    const err = await transitFetcher('https://t.example', 'secret', fake)('/x').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(TransitError);
    expect(String(err)).not.toMatch(/secret|t\.example/);
    expect((err as TransitError).code).toBe('upstream_unavailable');
    const offline = (async () => { throw new Error('boom secret'); }) as unknown as typeof fetch;
    expect(String(await transitFetcher('https://t.example', 'secret', offline)('/x').catch((e: unknown) => e))).not.toMatch(/secret/);
  });
});

describe('checkKey', () => {
  it('compares exactly', () => {
    expect(checkKey('abc', 'abc')).toBe(true);
    expect(checkKey('abd', 'abc')).toBe(false);
    expect(checkKey('abcd', 'abc')).toBe(false);
    expect(checkKey('', 'abc')).toBe(false);
    expect(checkKey(null, 'abc')).toBe(false);
  });
});

describe('bus card', () => {
  it('names the stop when there is exactly one', async () => {
    const board = await buildBoard(EXAMPLE_CONFIG, demo, NOW, 'v');
    const bus = board.cards.find((c) => c.kind === 'bus') as TransitCard;
    expect(bus.stop).toEqual({ name: 'Berry St/N 8 St', code: '308209' });
  });
});

describe('PATH rows', () => {
  it('are chips named by route id, labelled with the headsign', async () => {
    const board = await buildBoard(EXAMPLE_CONFIG, demo, NOW, 'v');
    const path = board.cards.find((c) => c.kind === 'path') as TransitCard;
    expect(path.rows.map((r) => [r.bullet?.name, r.label])).toEqual([['NWK-WTC', 'Newark'], ['HOB-WTC', 'Hoboken']]);
  });
});
