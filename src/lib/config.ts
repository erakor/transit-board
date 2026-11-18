import { z } from 'zod';

const walkMin = z.number().min(0).max(60);
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'expected HH:MM');

const subway = z.object({
  kind: z.literal('subway'),
  /** Station id from /stops/search (a complex is its stop ids joined with `+`). */
  stop: z.string().min(1),
  walkMin,
  /** Rider-facing names for the N and S platforms, such as Manhattan / Brooklyn. */
  labels: z.object({ N: z.string().optional(), S: z.string().optional() }).default({}),
  title: z.string().optional(),
  maxRows: z.number().int().min(1).max(6).default(4),
});

const bus = z.object({
  kind: z.literal('bus'),
  /** Six-digit codes from the stop sign (or /bus/nearby). */
  stops: z.array(z.string().min(1)).min(1),
  walkMin,
  title: z.string().optional(),
  maxRows: z.number().int().min(1).max(6).default(4),
});

const path = z.object({
  kind: z.literal('path'),
  station: z.string().min(1),
  walkMin,
  title: z.string().optional(),
  maxRows: z.number().int().min(1).max(6).default(4),
});

const citibike = z
  .object({
    kind: z.literal('citibike'),
    /** Either fixed station ids, or the nearest `count` stations to the board's location. */
    ids: z.array(z.string().min(1)).optional(),
    count: z.number().int().min(1).max(5).default(3),
    title: z.string().optional(),
  })
  .refine((c) => c.ids === undefined || c.ids.length > 0, 'ids must not be empty');

const alerts = z.object({
  kind: z.literal('alerts'),
  subwayStops: z.array(z.string()).default([]),
  busRoutes: z.array(z.string()).default([]),
  maxAlerts: z.number().int().min(1).max(10).default(6),
});

export const panelSchema = z.discriminatedUnion('kind', [subway, bus, path, citibike, alerts]);

export const boardConfigSchema = z.object({
  title: z.string().min(1),
  panels: z.array(panelSchema).min(1),
  /** Black screen between these two local (New York) times. */
  quietHours: z.tuple([hhmm, hhmm]).optional(),
  /** Used for sunrise and sunset, and for Citi Bike stations without fixed ids. Never sent to the browser. */
  location: z.object({ lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) }),
});

export type BoardConfig = z.infer<typeof boardConfigSchema>;
export type PanelConfig = z.infer<typeof panelSchema>;

/** Example values only. The real stops, walking times and location come from BOARD_CONFIG. */
export const EXAMPLE_CONFIG: BoardConfig = boardConfigSchema.parse({
  title: 'Williamsburg · Berry St',
  panels: [
    { kind: 'subway', stop: 'L08', walkMin: 4, labels: { N: 'Manhattan', S: 'Brooklyn' } },
    { kind: 'subway', stop: 'G29+L10', walkMin: 7, labels: { N: 'Queens', S: 'Brooklyn' } },
    { kind: 'bus', stops: ['308209'], walkMin: 3 },
    { kind: 'path', station: 'WTC', walkMin: 16 },
    { kind: 'citibike', count: 3 },
    { kind: 'alerts', subwayStops: ['L08', 'G29+L10'], busRoutes: ['B62', 'B32'] },
  ],
  quietHours: ['00:30', '06:00'],
  location: { lat: 40.7172, lon: -73.9569 },
});

export class ConfigError extends Error {}

/** BOARD_CONFIG is required in production; the example is only for development and demo mode. */
export function loadConfig(env: Record<string, string | undefined> = process.env): BoardConfig {
  const raw = env.BOARD_CONFIG?.trim();
  if (!raw) {
    if (env.NODE_ENV === 'production' && !env.BOARD_DEMO) throw new ConfigError('BOARD_CONFIG is not set');
    return EXAMPLE_CONFIG;
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new ConfigError('BOARD_CONFIG is not valid JSON');
  }
  const parsed = boardConfigSchema.safeParse(json);
  if (!parsed.success) throw new ConfigError(`BOARD_CONFIG is invalid: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  return parsed.data;
}
