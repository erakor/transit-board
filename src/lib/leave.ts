import type { Dep } from './types';

/**
 * The leave-in rule. For a departure at `time` and a walk of `walkSec`, you have to leave at
 * `time - walkSec`. The big number is the minutes until you must leave for the first train you can
 * still catch; trains you can't reach are not counted. Cancelled trains and trains with no
 * predicted time can't be caught either.
 */
export type Catchable = { dep: Dep; leaveBy: number; leaveInMin: number };

export type Departures = {
  /** First catchable train: the big number. */
  primary: Catchable | null;
  /** The trains after it, soonest first. */
  following: Catchable[];
  /** Soonest train that is still ahead but can't be reached, shown only when nothing else can. */
  tooLate: Dep | null;
  /** Soonest cancelled trip still ahead, struck through on the screen. */
  cancelled: Dep | null;
  /** Bus at its terminal with no prediction, when there is nothing to catch. */
  atTerminal: Dep | null;
};

export function leaveInMinutes(time: number, walkSec: number, now: number): number {
  return Math.floor((time - walkSec - now) / 60);
}

export function pickDepartures(deps: Dep[], walkSec: number, now: number, maxFollowing = 3): Departures {
  const catchable: Catchable[] = [];
  let tooLate: Dep | null = null;
  let cancelled: Dep | null = null;
  let atTerminal: Dep | null = null;
  for (const dep of deps) {
    if (dep.time === null) {
      if (!dep.cancelled) atTerminal ??= dep;
      continue;
    }
    if (dep.cancelled) {
      if (dep.time >= now) cancelled ??= dep;
      continue;
    }
    const leaveBy = dep.time - walkSec;
    if (leaveBy >= now) catchable.push({ dep, leaveBy, leaveInMin: leaveInMinutes(dep.time, walkSec, now) });
    else if (dep.time > now) tooLate ??= dep;
  }
  catchable.sort((a, b) => a.leaveBy - b.leaveBy);
  return {
    primary: catchable[0] ?? null,
    following: catchable.slice(1, 1 + maxFollowing),
    tooLate: catchable.length === 0 ? tooLate : null,
    cancelled,
    atTerminal: catchable.length === 0 ? atTerminal : null,
  };
}
