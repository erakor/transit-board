import { describe, expect, it } from 'vitest';
import { titleCase } from '@/lib/text';

describe('titleCase', () => {
  it.each([
    ['SBS EAST HARLEM 126 ST via 1 AV', 'SBS East Harlem 126 St via 1 Av'],
    ['DOWNTOWN BKLYN via LONG ISLAND CITY', 'Downtown Bklyn via Long Island City'],
    ['PEARL ST/BEEKMAN ST', 'Pearl St/Beekman St'],
    ['E 42ND ST - GRAND CENTRAL', 'E 42nd St - Grand Central'],
    ['JFK AIRPORT', 'JFK Airport'],
    ['Already Fine', 'Already Fine'],
  ])('%s', (input, expected) => expect(titleCase(input)).toBe(expected));
});
