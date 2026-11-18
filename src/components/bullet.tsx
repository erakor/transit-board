import type { Bullet as BulletData } from '@/lib/types';

/** A route bullet. Colors and text color come from the API, so they read right in either theme. */
export function RouteBullet({ route, size = 'md' }: { route: BulletData; size?: 'sm' | 'md' }) {
  const long = route.name.length > 2;
  const dim = size === 'md' ? 'h-[2.2rem] min-w-[2.2rem]' : 'h-[1.4rem] min-w-[1.4rem]';
  return (
    <span
      className={`${dim} inline-flex shrink-0 items-center justify-center rounded-full font-bold leading-none ${long ? 'px-2' : ''} ${size === 'md' ? 'text-[1.1rem]' : 'text-[1rem]'}`}
      style={{ backgroundColor: route.color, color: route.textColor }}
    >
      {route.name}
    </span>
  );
}
