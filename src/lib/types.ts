/** The board as /api/board returns it and the screen draws it. Times are epoch seconds. */

export type Bullet = { name: string; color: string; textColor: string };

export type Dep = {
  /** null for a bus at its terminal with no prediction */
  time: number | null;
  assigned?: boolean;
  stalled?: boolean;
  delayed?: boolean;
  cancelled?: boolean;
  atTerminal?: boolean;
  stopsAway?: number | null;
};

export type Row = {
  key: string;
  bullet: Bullet | null;
  label: string;
  /** Direction name ("Manhattan"), when the settings have one. */
  sub?: string;
  warn?: boolean;
  deps: Dep[];
};

export type TransitCard = {
  id: string;
  kind: 'subway' | 'bus' | 'path';
  title: string;
  walkMin: number;
  status: 'ok' | 'error';
  /** Oldest feed timestamp behind the card; null when unknown. */
  updatedAt: number | null;
  /** Some upstream feeds failed, so rows may be missing. */
  partial?: boolean;
  /** Bus stop name and sign code, when the card has exactly one stop. */
  stop?: { name: string | null; code: string };
  rows: Row[];
};

export type Station = {
  id: string;
  name: string;
  bikes: number;
  ebikes: number;
  docks: number;
  capacity: number;
  renting: boolean;
  returning: boolean;
};

export type BikeCard = {
  id: string;
  kind: 'citibike';
  title: string;
  status: 'ok' | 'error';
  updatedAt: number | null;
  stations: Station[];
};

export type Card = TransitCard | BikeCard;

export type AlertItem = {
  id: string;
  header: string;
  category: string | null;
  planned: boolean;
  routes: Bullet[];
};

export type Board = {
  /** Server clock, epoch seconds. The screen follows it, not its own clock. */
  now: number;
  title: string;
  cards: Card[];
  alerts: { status: 'ok' | 'error'; items: AlertItem[] };
  /** Sunrise and sunset today, epoch seconds; null near the poles. */
  sun: { rise: number; set: number } | null;
  quietHours: [string, string] | null;
  version: string;
};
