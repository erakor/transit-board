export const AMBER_AFTER_S = 60;
export const GREY_AFTER_S = 180;

export type Freshness = 'fresh' | 'amber' | 'stale';

export function freshness(ageSeconds: number): Freshness {
  if (ageSeconds > GREY_AFTER_S) return 'stale';
  if (ageSeconds > AMBER_AFTER_S) return 'amber';
  return 'fresh';
}

export function ageText(ageSeconds: number): string {
  const s = Math.max(0, Math.floor(ageSeconds));
  if (s < 90) return `updated ${s} s ago`;
  return `updated ${Math.round(s / 60)} min ago`;
}
