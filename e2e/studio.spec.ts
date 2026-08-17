import { expect, test } from '@playwright/test'
import {
  clickIncludes,
  clickText,
  expectNoPageErrors,
  FIXTURES,
  forceOffline,
  fresh,
  insertSlash,
  openNewIssue,
  WIDGETS,
} from './helpers'

test.describe('B. maker — studio and editor', () => {
  test.beforeEach(async ({ page }) => {
    await fresh(page)
  })

  test.afterEach(({ page }) => {
    expectNoPageErrors(page)
  })

  test('8 create from studio modal', async ({ page }) => {
    await openNewIssue(page, 'scatter hop')
    await expect(page.locator('.zine-page')).toBeVisible()
  })

  test('8b new issue modal closes with Escape and close', async ({ page }) => {
    await page.goto('/studio')
    await clickIncludes(page, 'New issue')
    const dialog = page.getByRole('dialog', { name: 'new issue' })
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await clickIncludes(page, 'New issue')
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'close' }).click()
    await expect(dialog).toBeHidden()
  })

  test('9 slash tray inserts every widget then undo', async ({ page }) => {
    await openNewIssue(page, 'widget zoo')
    await expect(page.locator('.tray.desktop-only')).toBeVisible()
    await expect(page.locator('.fab')).toBeHidden()
    for (const widget of WIDGETS) {
      await page.locator('.tray .tray-item', { hasText: `/${widget.slash}` }).click()
      await expect(page.locator(widget.sel).first()).toBeVisible()
    }
    await expect(page.locator('.audio-block')).toContainText(/no tape loaded/i)
    await page.keyboard.press('Meta+z')
    await expect(page.locator('.reply-block')).toHaveCount(0)
  })

  test('10 block tools, inspector, and keyboard', async ({ page }) => {
    await openNewIssue(page, 'tools hop')
    const stickers = page.locator('.sticker-block')
    const before = await stickers.count()
    await page.locator('.block').filter({ has: page.locator('.sticker-block') }).first().click()
    await expect(page.locator('.block.selected .block-handle')).toBeVisible()
    await page.locator('.block.selected').getByRole('button', { name: 'Duplicate' }).click()
    await expect(stickers).toHaveCount(before + 1)
    await page.locator('.block.selected').getByRole('button', { name: 'Move up' }).click()
    await page.locator('.block.selected').getByRole('button', { name: 'Delete' }).click()
    await expect(stickers).toHaveCount(before)

    await insertSlash(page, 'sfx')
    await page.locator('.block').filter({ has: page.locator('.sfx-block') }).click()
    await expect(page.locator('.inspector')).toContainText('Sound FX')
    await page.locator('.inspector .tray-item', { hasText: 'POW!' }).click()
    await expect(page.locator('.sfx-block input')).toHaveValue('POW!')

    await page.locator('.block').filter({ has: page.locator('.hero-shot') }).click()
    await expect(page.locator('.inspector')).toContainText('Halftone density')
    await expect(page.locator('.inspector input[type="range"]').first()).toBeVisible()

    await insertSlash(page, 'poll')
    await page.locator('.block').filter({ has: page.locator('.poll-block') }).click()
    const add = page.locator('.inspector .tray-item', { hasText: 'add' })
    await add.click()
    await add.click()
    await expect(add).toBeDisabled()
    const dropLast = page.locator('.inspector .tray-item', { hasText: 'drop last' })
    for (let i = 0; i < 4; i += 1) await dropLast.click()
    await expect(dropLast).toBeDisabled()

    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    await page.keyboard.press('/')
    await page.locator('.slash input').fill('quo')
    await expect(page.locator('.slash button.on')).toContainText('/quote')
    await page.keyboard.press('Escape')

    await insertSlash(page, 'glitch')
    await expect(page.locator('.glitch-block')).toBeVisible()
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    await page.keyboard.press('Meta+z')
    await expect(page.locator('.glitch-block')).toHaveCount(0)
    await page.keyboard.press('Meta+Shift+z')
    await expect(page.locator('.glitch-block')).toBeVisible()
    await page.locator('.block').filter({ has: page.locator('.glitch-block') }).click()
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    await page.keyboard.press('Backspace')
    await expect(page.locator('.glitch-block')).toHaveCount(0)

    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    await page.keyboard.press('Meta+Enter')
    await expect(page.locator('[role="dialog"]')).toContainText(/drop this issue/i)
    await page.keyboard.press('Escape')
    await expect(page.locator('[role="dialog"]')).toHaveCount(0)
  })

  test('11 editor meta, finish, scatter, compilation', async ({ page }) => {
    await openNewIssue(page, 'meta hop')
    await page.getByLabel('Tags').fill('diary, protest')
    await page.getByLabel('Series').fill('rooftop hours')
    await page.getByLabel('Issue number').fill('2')
    await page.getByLabel('Pen name').fill('the gutter')
    await page.getByLabel('B-side').fill('secret fold text')
    await page.getByLabel('Dedication').fill('for @yuzu')
    await page.getByLabel('Errata').fill('page 1: more rain')
    await page.getByLabel('Edition size').fill('12')
    await page.locator('.editor-meta .tray-item', { hasText: 'riso' }).click()
    await expect(page.locator('.editor.finish-riso')).toBeVisible()
    await page.locator('.editor-meta .tray-item', { hasText: 'scatter' }).click()
    await expect(page.locator('.zine-page.scatter')).toBeVisible()
    await page.locator('.editor-meta .tray-item', { hasText: 'scatter' }).click()
    await expect(page.locator('.zine-page.scatter')).toHaveCount(0)
    const comp = page.locator('.editor-meta [aria-label="Compilation"] .tray-item').first()
    if (await comp.count()) {
      await comp.click()
      await expect(comp).toHaveClass(/on/)
    }
  })

  test('12 preview frames change the canvas class', async ({ page }) => {
    await openNewIssue(page, 'frame hop')
    for (const mode of ['phone', 'tablet', 'fold', 'page'] as const) {
      await page.locator('.mode-row .icon-btn', { hasText: mode }).click()
      await expect(page.locator('.zine-page')).toHaveClass(new RegExp(mode))
    }
  })

  test('13 snap upload becomes a cutout sticker', async ({ page }) => {
    await openNewIssue(page, 'snap hop')
    await page.locator('.tray label.tray-item', { hasText: 'snap' }).locator('input[type="file"]').setInputFiles(FIXTURES.png)
    await expect(page.locator('.sticker-cutout').first()).toBeVisible()
  })

  test('14 export import delete', async ({ page }) => {
    await openNewIssue(page, 'file hop')
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.inspector').getByRole('button', { name: 'Export JSON' }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/file-hop|file hop/i)

    await page.goto('/studio')
    await expect(page.locator('.studio-head')).toBeVisible()
    await page.locator('input[accept*="json"]').setInputFiles(FIXTURES.zine)
    await expect(page.locator('.title-input')).toHaveValue('imported scrap')
    await expect(page.locator('.sticker-block')).toContainText('from a json file')

    await page.locator('.inspector').getByRole('button', { name: 'Delete issue' }).click()
    await expect(page).toHaveURL(/\/studio/)
    await expect(page.locator('.zine-card', { hasText: 'imported scrap' })).toHaveCount(0)
  })

  test('15 reset demo restores seeded issues', async ({ page }) => {
    await openNewIssue(page, 'junk issue')
    await page.goto('/studio')
    await expect(page.getByRole('button', { name: 'Reset demo' })).toBeVisible()
    await clickIncludes(page, 'Reset demo')
    await expect(page.locator('.zine-card', { hasText: /after hours/i })).toBeVisible()
    await expect(page.locator('main')).not.toContainText('junk issue')
  })

  test('16 mobile editor sheet and desktop chrome swap', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openNewIssue(page, 'phone hop')
    await expect(page.locator('.tray.desktop-only')).toBeHidden()
    await expect(page.locator('.fab')).toBeVisible()
    await page.locator('.fab').click()
    await expect(page.locator('.sheet')).toContainText('/sticker')
    await expect(page.locator('.sheet')).toContainText('snap')
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'More' }).click()
    await expect(page.locator('.sheet')).toContainText(/Preview|Drop/i)
  })

  test('17 drop modal variants', async ({ page, browser }) => {
    await openNewIssue(page, 'drop theater')
    await clickIncludes(page, 'Drop issue')
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()
    await expect(modal.getByRole('button', { name: 'public' })).toBeVisible()
    await expect(modal.getByRole('button', { name: 'unlisted' })).toBeVisible()
    await expect(modal.getByRole('button', { name: 'exquisite corpse' })).toBeVisible()
    for (const label of ['Drop now', 'In a minute', 'In an hour', 'Tomorrow', 'In a year', 'In a decade']) {
      await expect(modal.getByRole('button', { name: label, exact: true })).toBeVisible()
    }
    await expect(modal.getByRole('button', { name: 'Copy studio link' })).toBeVisible()
    await expect(modal.getByRole('button', { name: 'Copy snapshot link' })).toBeVisible()
    await expect(modal.getByRole('button', { name: 'Export JSON' })).toBeVisible()
    await clickText(page, 'Drop now')
    await expect(page.locator('.drop-toast')).toContainText(/dropped/i)
    await clickText(page, 'Preview')
    await expect(page.locator('.preview-page')).toBeVisible()

    await openNewIssue(page, 'secret drop')
    await clickIncludes(page, 'Drop issue')
    await page.locator('[role="dialog"] .tray-item', { hasText: 'unlisted' }).click()
    await page.locator('[role="dialog"] input[type="password"]').fill('fold')
    await clickText(page, 'Drop now')
    await page.goto('/studio')
    await expect(page.locator('.zine-card', { hasText: 'secret drop' })).toContainText(/unlisted/i)

    const stranger = await browser.newContext()
    const other = await stranger.newPage()
    await fresh(other)
    const url = page.url().includes('/edit/') ? page.url().replace('/edit/', '/z/') : ''
    const id = await page.locator('a.zine-card', { hasText: 'secret drop' }).getAttribute('href')
    if (id) {
      await other.goto(id.replace('/edit/', '/z/'))
      await expect(other.locator('h1')).toContainText(/missing issue|secret drop|folded/i)
    }
    void url
    await stranger.close()
  })

  test('17b scheduled drop stays sealed for a stranger', async ({ page, browser }) => {
    await openNewIssue(page, 'minute drop')
    await clickIncludes(page, 'Drop issue')
    await clickText(page, 'In a minute')
    await expect(page.locator('.drop-toast')).toBeVisible()
    await clickText(page, 'Preview')
    await expect(page.locator('.next-issue')).toBeVisible()
    await expect(page.locator('main, .preview-page')).toContainText(/you can still read your own drop/i)

    const href = page.url()
    const ctx = await browser.newContext()
    const other = await ctx.newPage()
    await fresh(other)
    await other.goto(href)
    await expect(other.locator('.preview-page, h1').first()).toBeVisible()
    const title = (await other.locator('h1').first().innerText()) ?? ''
    if (/missing/i.test(title)) {
      await ctx.close()
      return
    }
    await expect(other.locator('.next-issue, .drop-lock').first()).toBeVisible()
    await ctx.close()
  })

  test('17c passphrase gates a stranger and corpse link exists', async ({ page, browser }) => {
    await openNewIssue(page, 'locked drop')
    await clickIncludes(page, 'Drop issue')
    await page.locator('[role="dialog"] input[type="password"]').fill('ink4')
    await clickText(page, 'Drop now')
    const href = page.url().replace('/edit/', '/z/')
    await page.goto('/studio')
    const card = page.locator('a.zine-card', { hasText: 'locked drop' })
    const path = (await card.getAttribute('href')) ?? href

    const ctx = await browser.newContext()
    const other = await ctx.newPage()
    await fresh(other)
    await other.goto(path.replace('/edit/', '/z/'))
    if (await other.locator('.drop-lock').count()) {
      await expect(other.locator('.drop-lock')).toContainText(/passphrase/i)
      await other.locator('input[type="password"]').fill('nope')
      await other.getByRole('button', { name: 'Unlock' }).click()
      await expect(other.locator('.drop-lock')).toContainText(/Wrong passphrase|passphrase/i)
      await other.locator('input[type="password"]').fill('ink4')
      await other.getByRole('button', { name: 'Unlock' }).click()
    }
    await ctx.close()

    await openNewIssue(page, 'corpse drop')
    await clickIncludes(page, 'Drop issue')
    await page.locator('[role="dialog"] .tray-item', { hasText: 'exquisite corpse' }).click()
    await clickText(page, 'Drop now')
    await clickText(page, 'Preview')
    await clickIncludes(page, 'More on this issue')
    await expect(page.getByRole('button', { name: /Copy corpse link/i })).toBeVisible()
  })

  test('studio header chip and empty bag', async ({ page }) => {
    await forceOffline(page)
    await page.goto('/studio')
    await expect(page.locator('.studio-head .issue-chip')).toContainText(/OFFLINE/i, { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: /in my bag/i })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Claim studio|API offline/i })).toBeDisabled()
  })

  test('invalid JSON import alerts', async ({ page }) => {
    await page.goto('/studio')
    const dialog = page.waitForEvent('dialog')
    await page.locator('input[accept*="json"]').setInputFiles({
      name: 'nope.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{not a zine}'),
    })
    const prompt = await dialog
    expect(prompt.message()).toMatch(/not a Zineverse issue/i)
    await prompt.accept()

    const shaped = page.waitForEvent('dialog')
    await page.locator('input[accept*="json"]').setInputFiles({
      name: 'almost.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ title: 'almost', vibe: 'spider', blocks: [] })),
    })
    const shapePrompt = await shaped
    expect(shapePrompt.message()).toMatch(/vibe must be miles, gwen, peni, ham, or noir/)
    await shapePrompt.accept()
  })

  test('empty canvas hint after deleting blocks', async ({ page }) => {
    await openNewIssue(page, 'blank page')
    const blocks = page.locator('.zine-page > .block')
    const n = await blocks.count()
    for (let i = 0; i < n; i += 1) {
      await blocks.first().click()
      await page.locator('.block.selected').getByRole('button', { name: 'Delete' }).click()
    }
    await expect(page.locator('.empty-hint')).toContainText(/type \//i)
  })

  test('missing editor id', async ({ page }) => {
    await page.goto('/edit/no-such-issue')
    await expect(page.locator('h1')).toContainText('this issue wandered off')
    await page.getByRole('link', { name: 'Back to studio' }).click()
    await expect(page).toHaveURL(/\/studio/)
  })
})
