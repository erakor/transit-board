// Screenshots of the board in demo mode: 1080p and 4K, light and dark. Start the app first:
//   BOARD_DEMO=1 pnpm build && BOARD_DEMO=1 pnpm start
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
const { chromium } = createRequire(import.meta.url)('playwright')

const base = process.env.BOARD_URL ?? 'http://localhost:3000'
mkdirSync('screenshots', { recursive: true })
const browser = await chromium.launch()
for (const [name, width, height] of [
  ['1080p', 1920, 1080],
  ['4k', 3840, 2160],
]) {
  for (const theme of ['dark', 'light']) {
    const page = await browser.newPage({ viewport: { width, height } })
    await page.goto(`${base}/?theme=${theme}`)
    await page.waitForSelector('[data-row]')
    await page.screenshot({ path: `screenshots/${name}-${theme}.png` })
    await page.close()
  }
}
await browser.close()
