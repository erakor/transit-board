import type { Bullet as BulletData } from '@/lib/types';

/** A route bullet. Colors and text color come from the API, so they read right in either theme. */
export function RouteBullet({ route, size = 'md' }: { route: BulletData; size?: 'sm' | 'md' }) {
  const dim = size === 'md' ? 'h-[2.2rem] min-w-[2.2rem]' : 'h-[1.4rem] min-w-[1.4rem]';
  return (
    <span
      className={`${dim} inline-flex shrink-0 items-center justify-center rounded-full px-[0.35rem] font-bold leading-none ${size === 'md' ? 'text-[1.1rem]' : 'text-[1rem]'}`}
      style={{ backgroundColor: route.color, color: route.textColor }}
    >
      {route.name}
    </span>
  );
}

/** A rectangular route chip, for buses and PATH (their names are longer than a bullet holds). */
export function RouteChip({ route }: { route: BulletData }) {
  return (
    <span className="inline-flex h-[1.9rem] shrink-0 items-center justify-center rounded-md px-[0.6rem] text-[1.05rem] font-bold leading-none" style={{ backgroundColor: route.color, color: route.textColor }}>
      {route.name}
    </span>
  );
}
