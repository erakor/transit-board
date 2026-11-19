const KEEP_UPPER = new Set(['SBS', 'JFK', 'LGA', 'FDR', 'NYU', 'CUNY', 'BQE', 'LIRR', 'II', 'III', 'USPS', 'LIC', 'UN', 'US', 'NE', 'NW', 'SE', 'SW']);
const SMALL = new Set(['VIA', 'AND', 'OF', 'THE', 'TO']);

function titleWord(word: string): string {
  if (word === '') return word;
  if (word !== word.toUpperCase()) return word;
  if (KEEP_UPPER.has(word)) return word;
  if (SMALL.has(word)) return word.toLowerCase();
  const ordinal = /^(\d+)(ST|ND|RD|TH)$/.exec(word);
  if (ordinal) return `${ordinal[1]}${ordinal[2]!.toLowerCase()}`;
  if (/^\d+$/.test(word)) return word;
  return word.charAt(0) + word.slice(1).toLowerCase();
}

/** "SBS EAST HARLEM 126 ST via 1 AV" -> "SBS East Harlem 126 St via 1 Av". Mixed-case words are left alone. */
export function titleCase(text: string): string {
  return text
    .split(/(\s+|\/|-)/)
    .map((part) => (/^(\s+|\/|-)$/.test(part) ? part : titleWord(part)))
    .join('')
    .trim();
}

/** What an alert is called on screen: the MTA's status, or a generic name when the feed has none. */
export const alertLabel = (a: { category: string | null; planned: boolean }) => a.category ?? (a.planned ? 'Planned' : 'Alert');
