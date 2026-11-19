const TIME_ZONE = 'America/New_York'

/** Minutes after local midnight in New York, and the local date as YYYY-MM-DD. */
export function localParts(epochSeconds: number): { minutes: number; date: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(epochSeconds * 1000))
  const get = (type: string) => parts.find(p => p.type === type)!.value
  const hour = Number(get('hour')) % 24
  return { minutes: hour * 60 + Number(get('minute')), date: `${get('year')}-${get('month')}-${get('day')}` }
}

export function clock(epochSeconds: number): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(epochSeconds * 1000))
}

/** "10:56" and the seconds, for the header clock. */
export function clockParts(epochSeconds: number): { hm: string; ss: string } {
  return { hm: clock(epochSeconds), ss: String(epochSeconds % 60).padStart(2, '0') }
}

export function longDate(epochSeconds: number): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date(epochSeconds * 1000))
}

export function inQuietHours(quiet: [string, string] | null, epochSeconds: number): boolean {
  if (!quiet) return false
  const toMin = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3))
  const [from, to] = [toMin(quiet[0]), toMin(quiet[1])]
  const { minutes } = localParts(epochSeconds)
  return from <= to ? minutes >= from && minutes < to : minutes >= from || minutes < to
}
