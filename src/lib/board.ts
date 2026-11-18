import type { BoardConfig, PanelConfig } from './config';
import { sunTimes } from './sun';
import { titleCase } from './text';
import type { AlertsResponse, BusArrivals, Fetcher, NearbyStations, PathArrivals, StationResponse, SubwayAlertsResponse, SubwayArrivals } from './transit';
import type { AlertItem, BikeCard, Board, Bullet, Card, Dep, Row, RowAlert, Station, TransitCard } from './types';

type Config<K extends PanelConfig['kind']> = Extract<PanelConfig, { kind: K }>;

/** Dep lists are cut to this many so the screen has spares as trains become too late to catch. */
const MAX_DEPS = 5;

const cast = <T>(v: unknown) => v as T;
const bullet = (r: { name: string; color: string; textColor: string }): Bullet => ({ name: r.name, color: r.color, textColor: r.textColor });
const round4 = (n: number) => Math.round(n * 1e4) / 1e4;

export async function buildSubwayCard(cfg: Config<'subway'>, fetch: Fetcher, index: number): Promise<TransitCard> {
  const res = cast<SubwayArrivals>(await fetch('/subway/arrivals', { stop: cfg.stop, limit: MAX_DEPS }));
  const rows: Row[] = res.groups.map((g) => ({
    key: `${g.route}-${g.direction}`,
    bullet: bullet(g),
    label: g.headsign,
    sub: cfg.labels[g.direction],
    deps: g.arrivals.map((a) => ({ time: a.time, assigned: a.assigned, stalled: a.stalled, delayed: a.delayed })),
  }));
  return {
    id: `subway-${index}`,
    kind: 'subway',
    title: cfg.title ?? res.stop.name,
    walkMin: cfg.walkMin,
    status: 'ok',
    updatedAt: res.updatedAt,
    partial: (res.unavailableFeeds?.length ?? 0) > 0 || undefined,
    rows: rows.slice(0, cfg.maxRows),
  };
}

export async function buildPathCard(cfg: Config<'path'>, fetch: Fetcher, index: number): Promise<TransitCard> {
  const res = cast<PathArrivals>(await fetch('/path/arrivals', { station: cfg.station, limit: MAX_DEPS }));
  const rows: Row[] = res.groups.map((g) => ({
    key: `${g.route}-${g.direction}`,
    // the route id ("NWK-WTC") is the chip: the route name is too long for it
    bullet: bullet({ ...g, name: g.route }),
    label: g.headsign,
    sub: g.direction === 'NY' ? 'To New York' : 'To New Jersey',
    deps: g.arrivals.map((a) => ({ time: a.time })),
  }));
  return {
    id: `path-${index}`,
    kind: 'path',
    title: cfg.title ?? `PATH · ${res.station.name}`,
    walkMin: cfg.walkMin,
    status: 'ok',
    updatedAt: res.updatedAt,
    rows: rows.slice(0, cfg.maxRows),
  };
}

type BusArrival = BusArrivals['arrivals'][number];

/** Bus arrivals come as one flat list: group them by route and headsign, in the order they first appear. */
export function groupBuses(arrivals: BusArrival[]): Row[] {
  const rows = new Map<string, Row>();
  for (const a of arrivals) {
    const label = titleCase(a.headsign);
    const key = `${a.route}|${label}`;
    let row = rows.get(key);
    if (!row) {
      row = { key, bullet: bullet({ name: a.name, color: a.color, textColor: a.textColor }), label, deps: [] };
      rows.set(key, row);
    }
    row.deps.push({ time: a.time, stopsAway: a.stopsAway, atTerminal: a.atTerminal || undefined, cancelled: a.cancelled || undefined });
  }
  return [...rows.values()];
}

export async function buildBusCard(cfg: Config<'bus'>, fetch: Fetcher, index: number): Promise<TransitCard> {
  const results = await Promise.allSettled(cfg.stops.map((stop) => fetch('/bus/arrivals', { stop, limit: 12 })));
  const ok = results.flatMap((r) => (r.status === 'fulfilled' ? [cast<BusArrivals>(r.value)] : []));
  if (ok.length === 0) throw (results[0] as PromiseRejectedResult).reason;
  const merged = ok.flatMap((r) => r.arrivals).sort((a, b) => (a.time ?? Infinity) - (b.time ?? Infinity));
  const rows = groupBuses(merged).map((r) => ({ ...r, deps: r.deps.slice(0, MAX_DEPS) }));
  const updated = Math.min(...ok.map((r) => r.updatedAt ?? Infinity));
  return {
    id: `bus-${index}`,
    kind: 'bus',
    title: cfg.title ?? 'Nearby buses',
    walkMin: cfg.walkMin,
    status: 'ok',
    updatedAt: Number.isFinite(updated) ? updated : null,
    partial: ok.length < results.length || undefined,
    stop: cfg.stops.length === 1 ? { name: ok[0]!.stop.name ? titleCase(ok[0]!.stop.name) : null, code: cfg.stops[0]! } : undefined,
    rows: rows.slice(0, cfg.maxRows),
  };
}

type RawStation = NearbyStations['stations'][number];
const station = (s: RawStation | StationResponse['station']): Station => ({
  id: s.id,
  name: s.name,
  bikes: s.bikes,
  ebikes: s.ebikes,
  docks: s.docks,
  capacity: s.capacity,
  renting: s.renting,
  returning: s.returning,
});

export async function buildBikeCard(cfg: Config<'citibike'>, fetch: Fetcher, index: number, location: BoardConfig['location']): Promise<BikeCard> {
  let stations: Station[];
  let updatedAt: number | null;
  if (cfg.ids) {
    const results = await Promise.allSettled(cfg.ids.map((id) => fetch('/citibike/station', { id })));
    const ok = results.flatMap((r) => (r.status === 'fulfilled' ? [cast<StationResponse>(r.value)] : []));
    if (ok.length === 0) throw (results[0] as PromiseRejectedResult).reason;
    stations = ok.map((r) => station(r.station));
    updatedAt = Math.min(...ok.map((r) => r.updatedAt));
  } else {
    const res = cast<NearbyStations>(await fetch('/citibike/nearby', { lat: round4(location.lat), lon: round4(location.lon), n: cfg.count }));
    stations = res.stations.map(station);
    updatedAt = res.updatedAt;
  }
  return { id: `citibike-${index}`, kind: 'citibike', title: cfg.title ?? 'Citi Bike', status: 'ok', updatedAt, stations };
}

type RawAlert = AlertsResponse['alerts'][number];

/** Incidents before planned work, then the MTA's rank (higher is more serious). */
const byImportance = (a: RawAlert, b: RawAlert) => Number(a.planned) - Number(b.planned) || (b.priority ?? 0) - (a.priority ?? 0);

export function mergeAlerts(responses: AlertsResponse[], max: number): AlertItem[] {
  const seen = new Map<string, RawAlert>();
  for (const r of responses) for (const a of r.alerts) if (!seen.has(a.id)) seen.set(a.id, a);
  return [...seen.values()]
    .sort(byImportance)
    .slice(0, max)
    .map((a) => ({ id: a.id, header: a.header, category: a.category, planned: a.planned, routes: a.routes.map(bullet) }));
}

/** The tag for the most serious of these alerts: the MTA's status, without its "Planned - " prefix. */
export function rowAlert(alerts: RawAlert[]): RowAlert | undefined {
  const top = [...alerts].sort(byImportance)[0];
  if (!top) return undefined;
  const label = (top.category ?? (top.planned ? 'Planned work' : 'Alert')).replace(/^Planned\s*-\s*/, '');
  return { label, planned: top.planned };
}

/**
 * Subway alerts that concern one row: on its route, and in its direction when the alert names this
 * station only with the other direction's platform.
 */
export function subwayRowAlerts(alerts: RawAlert[], route: string, direction: string, stationStops: string[]): RawAlert[] {
  return alerts.filter((a) => {
    if (!a.routes.some((r) => r.id === route)) return false;
    const here = a.stops.filter((s) => stationStops.includes(s.id));
    return here.length === 0 || here.some((s) => s.direction === null || s.direction === direction);
  });
}

type Alerts = {
  status: 'ok' | 'error';
  items: AlertItem[];
  /** Answers by subway stop (the alerts panel's and every subway card's) and by bus route, to tag rows. */
  subway: Map<string, SubwayAlertsResponse>;
  bus: Map<string, AlertsResponse>;
};

export async function buildAlerts(cfg: Config<'alerts'> | undefined, subwayCardStops: string[], fetch: Fetcher): Promise<Alerts> {
  const panelStops = cfg?.subwayStops ?? [];
  const busRoutes = cfg?.busRoutes ?? [];
  const subwayStops = [...new Set([...panelStops, ...subwayCardStops])];
  const [subwayRes, busRes] = await Promise.all([
    Promise.allSettled(subwayStops.map((stop) => fetch('/subway/alerts', { stop }))),
    Promise.allSettled(busRoutes.map((route) => fetch('/bus/alerts', { route }))),
  ]);
  const subway = new Map<string, SubwayAlertsResponse>();
  subwayRes.forEach((r, i) => r.status === 'fulfilled' && subway.set(subwayStops[i]!, cast<SubwayAlertsResponse>(r.value)));
  const bus = new Map<string, AlertsResponse>();
  busRes.forEach((r, i) => r.status === 'fulfilled' && bus.set(busRoutes[i]!, cast<AlertsResponse>(r.value)));
  const strip = [...panelStops.flatMap((s) => subway.get(s) ?? []), ...bus.values()];
  const calls = panelStops.length + busRoutes.length;
  return {
    status: calls > 0 && strip.length === 0 ? 'error' : 'ok',
    items: cfg ? mergeAlerts(strip, cfg.maxAlerts) : [],
    subway,
    bus,
  };
}

/** Tags each row with the most serious alert on its route, from the answers buildAlerts got. */
function tagRows(card: Card, panel: PanelConfig, alerts: Alerts) {
  if (card.kind === 'subway' && panel.kind === 'subway') {
    const res = alerts.subway.get(panel.stop);
    if (!res) return;
    const stationStops = res.stop?.stops ?? panel.stop.split('+');
    for (const row of card.rows) {
      const cut = row.key.lastIndexOf('-');
      row.alert = rowAlert(subwayRowAlerts(res.alerts, row.key.slice(0, cut), row.key.slice(cut + 1), stationStops));
    }
  } else if (card.kind === 'bus') {
    for (const row of card.rows) row.alert = rowAlert(alerts.bus.get(row.key.split('|')[0]!)?.alerts ?? []);
  }
}

/** A card that failed to load: the rest of the screen stays normal. */
function failed(cfg: PanelConfig, index: number): Card {
  if (cfg.kind === 'citibike') return { id: `citibike-${index}`, kind: 'citibike', title: cfg.title ?? 'Citi Bike', status: 'error', updatedAt: null, stations: [] };
  const kind = cfg.kind as 'subway' | 'bus' | 'path';
  const title = ('title' in cfg && cfg.title) || { subway: 'Subway', bus: 'Nearby buses', path: 'PATH' }[kind];
  return { id: `${kind}-${index}`, kind, title, walkMin: 'walkMin' in cfg ? cfg.walkMin : 0, status: 'error', updatedAt: null, rows: [] };
}

export async function buildBoard(config: BoardConfig, fetch: Fetcher, now: number, version: string): Promise<Board> {
  const alertsCfg = config.panels.find((p): p is Config<'alerts'> => p.kind === 'alerts');
  const subwayStops = config.panels.flatMap((p) => (p.kind === 'subway' ? [p.stop] : []));
  // everything fans out in parallel; alerts tag the subway and bus rows afterwards
  const [alerts, settled] = await Promise.all([buildAlerts(alertsCfg, subwayStops, fetch), Promise.allSettled(
    config.panels.map((panel, i): Promise<Card | null> => {
      switch (panel.kind) {
        case 'subway':
          return buildSubwayCard(panel, fetch, i);
        case 'path':
          return buildPathCard(panel, fetch, i);
        case 'bus':
          return buildBusCard(panel, fetch, i);
        case 'citibike':
          return buildBikeCard(panel, fetch, i, config.location);
        case 'alerts':
          return Promise.resolve(null);
      }
    }),
  )]);
  const cards: Card[] = [];
  settled.forEach((r, i) => {
    const panel = config.panels[i]!;
    if (panel.kind === 'alerts') return;
    const card = r.status === 'fulfilled' && r.value ? r.value : failed(panel, i);
    if (card.status === 'ok') tagRows(card, panel, alerts);
    cards.push(card);
  });
  return {
    now,
    title: config.title,
    cards,
    alerts: { status: alerts.status, items: alerts.items },
    sun: sunTimes(now, config.location.lat, config.location.lon),
    quietHours: config.quietHours ?? null,
    version,
  };
}

export type { Dep };
