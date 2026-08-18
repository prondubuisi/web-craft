/**
 * Shared Playwright helpers.
 * Assumes `npm run dev` is already serving http://127.0.0.1:5173
 * (Vite + the SQLite API proxied from :8787).
 */
import { expect, test, type Browser, type Page } from '@playwright/test'
import { join } from 'node:path'
import type { BlockType } from '../src/lib/types'
import { WIDGETS as WIDGET_DEFS } from '../src/lib/widgets'

const errors = new WeakMap<Page, string[]>()

export const FIXTURES = {
  png: join(process.cwd(), 'e2e/fixtures/dot.png'),
  zine: join(process.cwd(), 'e2e/fixtures/sample.zine.json'),
}

export const GLOSSARY = [
  'issue',
  'vibe',
  'drop',
  'snapshot',
  'snap',
  'type',
  'cut',
  'sample',
  'scatter',
  'remix',
  'bag',
  'distro shelf',
  'archive',
  'board',
  'fest',
  'desk',
  'jam',
  'letters',
  'blurb',
  'margin',
  'dedication',
  'tear-out',
  'b-side',
  'corpse',
  'handle',
] as const

/** Rendered block selector per widget type — the one thing WidgetDef can't tell us. */
const SELECTORS: Record<BlockType, string> = {
  heading: '.heading-xl',
  sticker: '.sticker-block',
  hero: '.hero-shot',
  grid: '.grid-block',
  divider: '.divider',
  sfx: '.sfx-block',
  glitch: '.glitch-block',
  stack: '.stack-block',
  quote: '.quote-block',
  poll: '.poll-block',
  audio: '.audio-block',
  strip: '.strip-block',
  colophon: '.colophon-block',
  blackout: '.blackout-block',
  contents: '.contents-block',
  insert: '.insert-block',
  reply: '.reply-block',
}

// Derived from the app's own widget list (src/lib/widgets.ts) so the tray
// and its e2e coverage can't silently drift apart.
export const WIDGETS: { slash: string; sel: string }[] = WIDGET_DEFS.map((w) => ({
  slash: w.slash,
  sel: SELECTORS[w.type],
}))

export async function fresh(page: Page) {
  const bucket: string[] = []
  errors.set(page, bucket)
  page.on('pageerror', (err) => bucket.push(err.message))
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !/Failed to load resource|net::ERR/i.test(msg.text())) {
      bucket.push(msg.text())
    }
  })
  await page.addInitScript(() => {
    if (sessionStorage.getItem('e2e-cleared')) return
    localStorage.clear()
    sessionStorage.setItem('e2e-cleared', '1')
    window.print = () => {
      ;(window as unknown as { __printed?: boolean }).__printed = true
    }
  })
}

export function expectNoPageErrors(page: Page) {
  const bucket = errors.get(page) ?? []
  expect(bucket, bucket.join('\n')).toEqual([])
}

function luma(rgb: string) {
  const parts = rgb.match(/\d+/g)?.map(Number) ?? [0, 0, 0]
  return (0.2126 * parts[0] + 0.7152 * parts[1] + 0.0722 * parts[2]) / 255
}

/** Ghost ink must read against the paper surface it sits on. */
export async function expectGhostContrast(
  locator: import('@playwright/test').Locator,
  surface: 'paper' | 'ink',
) {
  const sample = await locator.evaluate((el) => {
    const style = getComputedStyle(el)
    const host = el.closest('.zine-page, .modal') ?? el.parentElement
    return { color: style.color, background: host ? getComputedStyle(host).backgroundColor : '' }
  })
  if (surface === 'paper') {
    expect(luma(sample.color), `ghost ink ${sample.color} on paper`).toBeLessThan(0.35)
    expect(luma(sample.background), `paper surface ${sample.background}`).toBeGreaterThan(0.7)
  } else {
    expect(luma(sample.color), `ghost ink ${sample.color} on ink`).toBeGreaterThan(0.7)
  }
}

export async function clickText(page: Page, text: string) {
  await page
    .locator('a,button,label,span')
    .filter({ hasText: new RegExp(`^\\s*${escapeRe(text)}\\s*$`, 'i') })
    .first()
    .click()
}

export async function clickIncludes(page: Page, text: string) {
  await page
    .locator('a,button,label')
    .filter({ hasText: new RegExp(text, 'i') })
    .first()
    .click()
}

export async function forceOffline(page: Page) {
  await page.route('**/api/**', (route) =>
    route.fulfill({ status: 503, contentType: 'application/json', body: '{"ok":false}' }),
  )
}

export async function apiIsUp(page: Page): Promise<boolean> {
  try {
    const res = await page.request.get('/api/health')
    return res.ok()
  } catch {
    return false
  }
}

export async function waitForStudioMode(page: Page) {
  await expect(page.locator('.studio-head .issue-chip').first()).toBeVisible()
}

/** Health is local and fast; CI keeps the long Fly-wake ceiling. */
export const HEALTH_MS = process.env.CI ? 15_000 : 4_000

export async function requireApi(page: Page) {
  if (await apiIsUp(page)) return
  if (process.env.CI) throw new Error('API must be up in CI')
  test.skip(true, 'API offline')
}

export async function claimHandle(page: Page, handle?: string): Promise<string | null> {
  await page.goto('/studio')
  const claim = page.getByRole('button', { name: /Claim studio|API offline|Checking API/i })
  await expect(claim).toBeVisible()
  await expect(claim).not.toHaveText(/Checking API/i, { timeout: HEALTH_MS })
  if (!(await claim.isEnabled()) || /offline/i.test((await claim.innerText()) ?? '')) {
    if (process.env.CI) throw new Error('API must be up in CI')
    return null
  }
  await claim.click()
  const name = handle ?? uniqueHandle()
  await page.locator('[role="dialog"] input').nth(0).fill(name)
  await page.locator('[role="dialog"] input[type="password"]').fill('inkstain1')
  await clickText(page, 'Claim it')
  await expect(page.locator('.studio-head')).toContainText(new RegExp(`@${name}`, 'i'))
  return name
}

export function uniqueHandle() {
  return `pw${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 5)}`
}

export async function requireHandle(page: Page, handle?: string): Promise<string> {
  const name = await claimHandle(page, handle)
  if (name) return name
  test.skip(true, 'API offline')
  return ''
}

/**
 * `worker` must be the same `x-e2e-worker` value the primary context routes
 * with (see e2e/fixtures.ts) — any context made directly from `browser`
 * bypasses the `context` fixture that sets it automatically, and would
 * otherwise land on the wrong worker's isolated backend.
 */
export async function routedContext(browser: Browser, worker: string) {
  const ctx = await browser.newContext()
  await ctx.route('**/api/**', (route) => {
    route.continue({ headers: { ...route.request().headers(), 'x-e2e-worker': worker } })
  })
  return ctx
}

export async function openSecondDesk(browser: Browser, worker: string) {
  const ctx = await routedContext(browser, worker)
  const page = await ctx.newPage()
  await fresh(page)
  const handle = await requireHandle(page)
  return { ctx, page, handle }
}

export async function openNewIssue(page: Page, title: string) {
  await page.goto('/studio')
  await clickIncludes(page, 'New issue')
  await page.locator('[role="dialog"] input').fill(title)
  await clickText(page, 'Open the page')
  await expect(page.locator('.title-input')).toHaveValue(title)
}

export async function insertSlash(page: Page, slash: string) {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await page.keyboard.press('/')
  await page.locator('.slash input').fill(slash)
  await page.keyboard.press('Enter')
}

export async function dropNow(page: Page) {
  await clickIncludes(page, 'Drop issue')
  await expect(page.locator('[role="dialog"]')).toBeVisible()
  await clickText(page, 'Drop now')
  await expect(page.locator('.drop-toast')).toContainText(/dropped/i)
}

export async function readIssue(page: Page, title: string | RegExp) {
  const card = page.locator('.zine-card').filter({ hasText: title }).first()
  await expect(card).toBeVisible()
  await card.getByRole('link', { name: /Read|Peek/i }).click()
}

function escapeRe(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function encodeShareToken(payload: {
  v: 1
  title: string
  vibe: string
  owner: string
  dropsAt: number | null
  blocks: unknown[]
}) {
  const json = JSON.stringify(payload)
  return Buffer.from(json)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}
