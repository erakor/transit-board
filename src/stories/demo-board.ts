/**
 * Boards built by the real builder from the demo data, as in test/board.test.ts, so stories show what
 * demo mode shows. Built once, in parallel, when the first story that needs them loads.
 */
import { buildBoard } from '@/lib/board'
import { EXAMPLE_CONFIG } from '@/lib/config'
import { DEMO_NOW, demoFetcher, failingFetcher } from '@/lib/demo'
import type { BikeCard, Card, TransitCard } from '@/lib/types'

const demo = demoFetcher(() => DEMO_NOW)
const build = (fails: (path: string) => boolean = () => false) =>
  buildBoard(EXAMPLE_CONFIG, failingFetcher(demo, fails), DEMO_NOW, 'storybook')

export const [BOARD, BOARD_PATH_DOWN, BOARD_ALERTS_DOWN] = await Promise.all([
  build(),
  build((path) => path === '/path/arrivals'),
  build((path) => path.endsWith('/alerts')),
])

/** The nth card of a kind, by position among cards of that kind, so it doesn't depend on panel order. */
function cardOf<K extends Card['kind']>(kind: K, nth = 0): Extract<Card, { kind: K }> {
  const card = BOARD.cards.filter((c) => c.kind === kind)[nth]
  if (!card)
    throw new Error(`EXAMPLE_CONFIG has no ${kind} panel #${nth + 1}; the stories need one`)
  return card as Extract<Card, { kind: K }>
}

export const SUBWAY_CARD: TransitCard = cardOf('subway')
export const SUBWAY_COMPLEX_CARD: TransitCard = cardOf('subway', 1)
export const BUS_CARD: TransitCard = cardOf('bus')
export const PATH_CARD: TransitCard = cardOf('path')
export const BIKE_CARD: BikeCard = cardOf('citibike')
export const ALERTS = BOARD.alerts.items
