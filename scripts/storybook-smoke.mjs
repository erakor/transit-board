// Opens every story in the built Storybook and fails if any throws or shows Storybook's error screen.
//   pnpm build-storybook && node scripts/storybook-smoke.mjs
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
const { chromium } = createRequire(import.meta.url)('playwright')

const dir = process.env.STORYBOOK_DIR ?? 'storybook-static'
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
}
const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(
    /^(\.\.[/\\])+/,
    '',
  )
  try {
    const body = await readFile(join(dir, path === '/' ? 'index.html' : path))
    res
      .writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' })
      .end(body)
  } catch {
    res.writeHead(404).end()
  }
}).listen(0)
const base = `http://localhost:${server.address().port}`

const { entries } = JSON.parse(await readFile(join(dir, 'index.json'), 'utf8'))
const ids = Object.values(entries)
  .filter((e) => e.type === 'story')
  .map((e) => e.id)
const browser = await chromium.launch()
const failures = []
for (const id of ids) {
  const page = await browser.newPage()
  page.on('pageerror', (e) => failures.push(`${id}: ${e.message}`))
  await page.goto(`${base}/iframe.html?id=${id}&viewMode=story`)
  await page
    .waitForFunction(
      () => /sb-show-(main|errordisplay|nopreview)/.test(document.body.className),
      null,
      {
        timeout: 15_000,
      },
    )
    .catch(() => failures.push(`${id}: did not render`))
  if (await page.evaluate(() => !document.body.classList.contains('sb-show-main')))
    failures.push(
      `${id}: ${(await page.textContent('#error-message').catch(() => null))?.trim() || 'error screen'}`,
    )
  await page.close()
}
await browser.close()
server.close()
console.log(
  `${ids.length - new Set(failures.map((f) => f.split(':')[0])).size}/${ids.length} stories rendered`,
)
if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}
