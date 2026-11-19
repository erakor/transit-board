import { describe, expect, it } from 'vitest'
import { isDaytime, sunTimes } from '@/lib/sun'
import { inQuietHours, localParts } from '@/lib/time'

const LAT = 40.7172
const LON = -73.9569
const minutes = (epoch: number) => localParts(epoch).minutes

describe('sunTimes', () => {
  it('matches published New York times around the solstices, within 5 minutes', () => {
    // 2026-06-21: sunrise about 05:25, sunset about 20:31 (EDT)
    const june = sunTimes(Date.UTC(2026, 5, 21, 16) / 1000, LAT, LON)!
    expect(Math.abs(minutes(june.rise) - (5 * 60 + 25))).toBeLessThanOrEqual(5)
    expect(Math.abs(minutes(june.set) - (20 * 60 + 31))).toBeLessThanOrEqual(5)
    // 2026-12-21: sunrise about 07:17, sunset about 16:32 (EST)
    const dec = sunTimes(Date.UTC(2026, 11, 21, 17) / 1000, LAT, LON)!
    expect(Math.abs(minutes(dec.rise) - (7 * 60 + 17))).toBeLessThanOrEqual(5)
    expect(Math.abs(minutes(dec.set) - (16 * 60 + 32))).toBeLessThanOrEqual(5)
  })

  it('is light between sunrise and sunset only', () => {
    const noon = Date.UTC(2026, 5, 21, 16) / 1000
    const sun = sunTimes(noon, LAT, LON)
    expect(isDaytime(sun, noon)).toBe(true)
    expect(isDaytime(sun, noon + 10 * 3600)).toBe(false)
    expect(isDaytime(null, noon)).toBe(false)
  })
})

describe('inQuietHours', () => {
  const at = (h: number, m: number) => Date.UTC(2026, 0, 15, h + 5, m) / 1000 // EST
  it('spans midnight', () => {
    const q: [string, string] = ['00:30', '06:00']
    expect(inQuietHours(q, at(0, 15))).toBe(false)
    expect(inQuietHours(q, at(0, 30))).toBe(true)
    expect(inQuietHours(q, at(5, 59))).toBe(true)
    expect(inQuietHours(q, at(6, 0))).toBe(false)
  })
  it('handles a same-day window and no window', () => {
    expect(inQuietHours(['22:00', '23:00'], at(22, 30))).toBe(true)
    expect(inQuietHours(null, at(3, 0))).toBe(false)
  })
})
