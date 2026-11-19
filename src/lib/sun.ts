import { localParts } from './time'

const RAD = Math.PI / 180
const mod = (a: number, n: number) => ((a % n) + n) % n

/** Almanac for Computers: UT hour of sunrise or sunset on a UTC calendar day, null if the sun doesn't rise or set. */
function utHour(
  year: number,
  month: number,
  day: number,
  lat: number,
  lon: number,
  rising: boolean,
): number | null {
  const dayOfYear = Math.floor((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 0)) / 86_400_000)
  const lngHour = lon / 15
  const t = dayOfYear + ((rising ? 6 : 18) - lngHour) / 24
  const M = 0.9856 * t - 3.289
  const L = mod(M + 1.916 * Math.sin(M * RAD) + 0.02 * Math.sin(2 * M * RAD) + 282.634, 360)
  let RA = mod(Math.atan(0.91764 * Math.tan(L * RAD)) / RAD, 360)
  RA += Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90
  RA /= 15
  const sinDec = 0.39782 * Math.sin(L * RAD)
  const cosDec = Math.cos(Math.asin(sinDec))
  const cosH =
    (Math.cos(90.833 * RAD) - sinDec * Math.sin(lat * RAD)) / (cosDec * Math.cos(lat * RAD))
  if (cosH > 1 || cosH < -1) return null
  const H = (rising ? 360 - Math.acos(cosH) / RAD : Math.acos(cosH) / RAD) / 15
  const T = H + RA - 0.06571 * t - 6.622
  return mod(T - lngHour, 24)
}

/** Sunrise and sunset (epoch seconds) for the New York calendar day containing `epochSeconds`. */
export function sunTimes(
  epochSeconds: number,
  lat: number,
  lon: number,
): { rise: number; set: number } | null {
  const [y, m, d] = localParts(epochSeconds).date.split('-').map(Number) as [number, number, number]
  const rise = utHour(y, m, d, lat, lon, true)
  const set = utHour(y, m, d, lat, lon, false)
  if (rise === null || set === null) return null
  const base = Date.UTC(y, m - 1, d) / 1000
  const riseAt = base + rise * 3600
  let setAt = base + set * 3600
  if (setAt < riseAt) setAt += 86_400 // evening in New York is already the next UTC day
  return { rise: Math.round(riseAt), set: Math.round(setAt) }
}

export function isDaytime(sun: { rise: number; set: number } | null, now: number): boolean {
  return sun !== null && now >= sun.rise && now < sun.set
}
