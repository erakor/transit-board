import { describe, expect, it } from 'vitest'
import { pickDepartures } from '@/lib/leave'

const NOW = 1_800_000_000
const walk = 4 * 60
const at = (min: number, extra = {}) => ({ time: NOW + min * 60, ...extra })

describe('leave-in rule', () => {
  it('counts minutes until you must leave, not until the train arrives', () => {
    const d = pickDepartures([at(12)], walk, NOW)
    expect(d.primary?.leaveInMin).toBe(8)
    expect(d.primary?.leaveBy).toBe(NOW + 8 * 60)
  })

  it('skips trains you cannot reach and does not count them', () => {
    const d = pickDepartures([at(2), at(3), at(9), at(15)], walk, NOW)
    expect(d.primary?.leaveInMin).toBe(5)
    expect(d.following.map((f) => f.leaveInMin)).toEqual([11])
    expect(d.tooLate).toBeNull()
  })

  it('a PATH train 1 minute away is too late on a 16 minute walk', () => {
    const d = pickDepartures([at(1), at(22)], 16 * 60, NOW)
    expect(d.primary?.leaveInMin).toBe(6)
  })

  it('labels the soonest train too late when nothing can be caught', () => {
    const d = pickDepartures([at(1), at(3)], walk, NOW)
    expect(d.primary).toBeNull()
    expect(d.tooLate?.time).toBe(NOW + 60)
  })

  it('leaves exactly now counts as catchable; a train already gone does not', () => {
    expect(pickDepartures([at(4)], walk, NOW).primary?.leaveInMin).toBe(0)
    expect(pickDepartures([at(-1)], walk, NOW).primary).toBeNull()
    expect(pickDepartures([at(-1)], walk, NOW).tooLate).toBeNull()
  })

  it('skips cancelled trips and reports the next one', () => {
    const d = pickDepartures([at(10, { cancelled: true }), at(20)], walk, NOW)
    expect(d.primary?.leaveInMin).toBe(16)
    expect(d.cancelled?.time).toBe(NOW + 600)
  })

  it('shows a bus at its terminal only when there is nothing to catch', () => {
    expect(pickDepartures([{ time: null, atTerminal: true }], walk, NOW).atTerminal).not.toBeNull()
    expect(
      pickDepartures([at(10), { time: null, atTerminal: true }], walk, NOW).atTerminal,
    ).toBeNull()
  })

  it('ticks down as the clock moves', () => {
    const deps = [at(12)]
    expect(pickDepartures(deps, walk, NOW + 60).primary?.leaveInMin).toBe(7)
  })
})
