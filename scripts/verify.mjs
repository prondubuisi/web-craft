import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const OUT = 'scripts/shots'
mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--no-sandbox', '--window-size=1440,900'],
  defaultViewport: { width: 1440, height: 900 },
})

const page = await browser.newPage()
const errors = []
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`console: ${msg.text()}`)
})

async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })
}

async function assert(cond, msg) {
  if (!cond) errors.push(`assert: ${msg}`)
}

async function clickText(text) {
  const handle = await page.evaluateHandle((needle) => {
    const nodes = [...document.querySelectorAll('a,button,span')]
    return nodes.find((el) => el.textContent?.replace(/\s+/g, ' ').trim().includes(needle)) ?? null
  }, text)
  const el = handle.asElement()
  if (!el) throw new Error(`no element with text: ${text}`)
  await el.click()
}

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' })
await page.evaluate(() => localStorage.removeItem('zineverse.v1'))
await page.reload({ waitUntil: 'networkidle0' })
await page.waitForSelector('h1')
const title = await page.$eval('h1', (el) => el.textContent)
assert(title?.includes('ZINEVERSE'), `landing title was ${title}`)
await shot('01-landing-desktop')

const vibeBtns = await page.$$('.vibe-card')
assert(vibeBtns.length === 5, `expected 5 vibe cards, got ${vibeBtns.length}`)
await vibeBtns[2].click()
await page.waitForSelector('[data-vibe="peni"]')
await shot('02-landing-peni')

await clickText('Enter the studio')
await page.waitForSelector('h1')
const studioH = await page.$eval('h1', (el) => el.textContent)
assert(studioH?.toLowerCase().includes('your zines'), `studio title ${studioH}`)
await shot('03-studio')

await clickText('Drop a new issue')
await page.waitForSelector('[role="dialog"]')
await clickText('Gwen')
const titleInput = await page.$('[role="dialog"] input')
await titleInput.click()
await titleInput.type('verify hop')
await clickText('Open the page')
await page.waitForSelector('.zine-page')
const editorTitle = await page.$eval('.title-input', (el) => el.value)
assert(editorTitle === 'verify hop', `editor title ${editorTitle}`)
const heading = await page.$eval('.heading-xl', (el) => el.value || el.textContent)
assert(heading?.toLowerCase().includes('verify hop'), `heading ${heading}`)
const trayLabel = await page.$eval('.tray-item', (el) => el.textContent)
assert(trayLabel && trayLabel.trim().length > 0, `tray item blank: ${trayLabel}`)
await shot('04-editor-new')

await clickText('/sfx')
await page.waitForSelector('.sfx-block')
await page.keyboard.press('/')
await page.waitForSelector('.slash input')
await page.type('.slash input', 'halftone')
await page.keyboard.press('Enter')
await page.waitForSelector('.hero-shot')
const heroesBeforeUndo = await page.$$('.hero-shot')
assert(heroesBeforeUndo.length >= 2, `expected 2 heroes after slash add, got ${heroesBeforeUndo.length}`)
await page.keyboard.down('Meta')
await page.keyboard.press('KeyZ')
await page.keyboard.up('Meta')
await page.waitForFunction(() => document.querySelectorAll('.hero-shot').length === 1)
await shot('05-editor-widgets')

await page.select('select[aria-label="Vibe"]', 'noir')
await page.waitForSelector('[data-vibe="noir"]')
await clickText('phone')
await page.waitForSelector('.zine-page.phone')
await shot('06-editor-noir-phone')

await clickText('Drop issue')
await page.waitForSelector('[role="dialog"]')
await clickText('In a minute')
await page.waitForSelector('.drop-toast')
await shot('05b-drop-modal')

await clickText('Preview')
await page.waitForSelector('.preview-page')
await clickText('Like')
const likeText = await page.$eval('.preview-page .comic-btn', (el) => el.textContent)
assert(likeText?.includes('Liked'), `like button ${likeText}`)
await shot('07-preview-like')

await page.goto('http://127.0.0.1:5173/explore', { waitUntil: 'networkidle0' })
await page.waitForSelector('.zine-card')
const cards = await page.$$('.zine-card')
assert(cards.length >= 3, `explore cards ${cards.length}`)
const streamText = await page.$eval('main', (el) => el.textContent ?? '')
assert(streamText.includes('NEXT ISSUE'), 'explore missing NEXT ISSUE banner')
assert(streamText.toLowerCase().includes('midnight run'), 'explore missing midnight run')
await shot('08-explore')

await page.evaluate(() => {
  const card = [...document.querySelectorAll('.zine-card')].find((el) =>
    /midnight run/i.test(el.textContent ?? ''),
  )
  const link = card?.querySelector('a.comic-btn')
  link?.click()
})
await page.waitForSelector('.drop-lock')
const locked = await page.$('.drop-lock')
assert(Boolean(locked), 'scheduled drop did not seal pages')
await shot('08b-sealed-drop')
await page.goto('http://127.0.0.1:5173/explore', { waitUntil: 'networkidle0' })
await page.waitForSelector('.zine-card')

await clickText('Remix')
await page.waitForSelector('.title-input')
const remixTitle = await page.$eval('.title-input', (el) => el.value)
assert(remixTitle.includes('remix'), `remix title ${remixTitle}`)
await shot('09-remix-editor')

await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' })
await page.waitForSelector('h1')
await shot('10-landing-mobile')
await page.goto('http://127.0.0.1:5173/studio', { waitUntil: 'networkidle0' })
await page.waitForSelector('h1')
await shot('11-studio-mobile')
await page.click('a.zine-card')
await page.waitForSelector('.fab')
await page.click('.fab')
await page.waitForSelector('.sheet')
const sheetText = await page.$eval('.sheet', (el) => el.textContent ?? '')
assert(sheetText.includes('/sticker'), `mobile tray missing widgets: ${sheetText}`)
await shot('12-editor-mobile-sheet')

await browser.close()

if (errors.length) {
  console.error('VERIFY FAILED')
  for (const e of errors) console.error('-', e)
  process.exit(1)
}
console.log('VERIFY OK')
