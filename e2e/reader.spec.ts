import { expect, test } from '@playwright/test'
import {
  clickIncludes,
  clickText,
  dropNow,
  expectNoPageErrors,
  expectGhostContrast,
  forceOffline,
  fresh,
  insertSlash,
  openNewIssue,
  readIssue,
} from './helpers'

test.describe('C. reader — /z/:id', () => {
  test.beforeEach(async ({ page }) => {
    await fresh(page)
  })

  test.afterEach(({ page }) => {
    expectNoPageErrors(page)
  })

  test('ghost buttons read on paper and stay cream on ink', async ({ page }) => {
    await page.goto('/explore')
    await readIssue(page, /sunday market/i)
    const more = page.getByRole('button', { name: /More on this issue/i })
    await expect(more).toBeVisible()
    await expectGhostContrast(more, 'paper')
    await more.click()
    await expectGhostContrast(page.getByRole('button', { name: /Preview fold/i }), 'paper')

    await openNewIssue(page, 'ghost drop')
    await clickIncludes(page, 'Drop issue')
    await expectGhostContrast(page.locator('[role="dialog"]').getByRole('button', { name: 'Export JSON' }), 'paper')
    await page.keyboard.press('Escape')

    await page.goto('/help')
    await expectGhostContrast(page.locator('.help-page .comic-btn.ghost').first(), 'ink')
  })

  test('18 primary actions stay thin', async ({ page }) => {
    await openNewIssue(page, 'reader hop')
    await dropNow(page)
    await clickText(page, 'Preview')
    await expect(page.locator('.preview-page')).toBeVisible()
    await clickIncludes(page, 'Like')
    await expect(page.locator('.issue-actions')).toContainText(/Liked/i)
    await clickIncludes(page, 'Stuff in bag')
    await expect(page.locator('.issue-actions')).toContainText(/In the bag/i)
    await expect(page.locator('.issue-actions').getByRole('link', { name: 'Edit' })).toBeVisible()
    await page.locator('.issue-actions').getByRole('button', { name: /Print issue/i }).click()
    await clickIncludes(page, 'Flip pages')
    await expect(page.locator('.flip-reader')).toBeVisible()
    await expect(page.locator('.flip-reader')).toContainText(/PAGE /)
    await clickIncludes(page, 'Scroll')
    await expect(page.locator('.flip-reader')).toHaveCount(0)
    const primary = await page.locator('.issue-actions').innerText()
    expect(primary).not.toMatch(/Nominate|Preview fold|Copy snapshot/)
    await page.locator('.issue-actions').getByRole('button', { name: /Remix/i }).click()
    await expect(page.locator('.title-input')).toBeVisible()
  })

  test('19 more sheet: fold, bag extras, b-side, claim, watch', async ({ page }) => {
    await page.goto('/explore')
    await readIssue(page, /sunday market/i)
    await clickIncludes(page, 'More on this issue')
    const more = page.locator('.issue-more')
    await expect(more).toBeVisible()
    await expect(more).toContainText(/Bag is private/i)
    await expect(more.getByRole('link', { name: /What the words mean/i })).toHaveAttribute('href', /help/)
    await more.getByRole('link', { name: /What the words mean/i }).click()
    await expect(page).toHaveURL(/\/help/)
    await page.goBack()
    await expect(page).toHaveURL(/\/z\//)
    const moreBtn = page.getByRole('button', { name: /More on this issue|Less/i })
    if (/more/i.test((await moreBtn.innerText()) ?? '')) await moreBtn.click()
    await expect(more.getByRole('button', { name: /Copy snapshot/i })).toBeVisible()
    await more.getByRole('button', { name: 'Preview fold' }).click()
    await expect(page.locator('.fold-wrap.on .fold-sheet')).toBeVisible()
    await expect(page.locator('.fold-qr svg')).toBeVisible({ timeout: 10_000 })
    await more.getByRole('button', { name: 'Hide fold' }).click()
    await expect(page.locator('.fold-wrap.on')).toHaveCount(0)
    await more.getByRole('button', { name: /Stock in distro/i }).click()
    await more.getByRole('button', { name: /Nominate/i }).click()
    await expect(more.getByRole('button', { name: /Nominated/i })).toBeVisible()
    await more.getByRole('button', { name: /Watch this run/i }).click()
    await expect(more.getByRole('button', { name: /Watching run/i })).toBeVisible()
    await expect(more.getByRole('button', { name: /Claim /i })).toBeVisible()
    await more.getByRole('button', { name: /Unfold the b-side/i }).click()
    await expect(page.locator('.bside-reveal')).toContainText(/booth 12/i)
    await more.getByRole('button', { name: /Print fold sheet/i }).click()

    await page.goto('/explore')
    await readIssue(page, /issue 13/i)
    await clickIncludes(page, 'More on this issue')
    await expect(page.locator('.issue-more').getByRole('button', { name: /Check out|On loan/i })).toBeVisible()
    await expect(page.locator('.issue-more').getByRole('button', { name: /Out of print|Claim /i })).toBeVisible()
  })

  test('20 blurbs, letters, margins, tear-out', async ({ page }) => {
    await forceOffline(page)
    await openNewIssue(page, 'social hop')
    await insertSlash(page, 'reply')
    await dropNow(page)
    await clickText(page, 'Preview')

    const blurbs = page.getByLabel('Blurbs')
    await blurbs.locator('textarea').fill('one line. no stars.')
    await blurbs.getByRole('button', { name: 'Stamp it' }).click()
    await expect(blurbs).toContainText('one line. no stars.')
    await blurbs.locator('textarea').fill('replaced blurb')
    await blurbs.getByRole('button', { name: 'Stamp it' }).click()
    await expect(blurbs).toContainText('replaced blurb')
    await expect(blurbs.locator('.comment')).toHaveCount(1)

    const letters = page.getByLabel('Letters')
    await letters.locator('textarea').fill('ink on the wall')
    await letters.getByRole('button', { name: 'Send it' }).click()
    await expect(letters).toContainText('ink on the wall')

    await page.locator('[aria-label="Marginalia"]').first().click()
    await page.locator('.margin-panel input').fill('gutter note')
    await page.locator('.margin-panel').getByRole('button', { name: 'Pin' }).click()
    await expect(page.locator('.margin-panel')).toContainText('gutter note')

    if (await page.locator('.reply-block textarea').count()) {
      await page.locator('.reply-block textarea').fill('tore it out')
      await page.locator('.reply-block').getByRole('button', { name: /Mail|Send/i }).click()
    } else {
      await expect(page.locator('.reply-block')).toContainText(/claim a handle|tear/i)
    }
  })

  test('21 street poll vote persists on reload', async ({ page }) => {
    await openNewIssue(page, 'poll hop')
    await insertSlash(page, 'poll')
    await dropNow(page)
    await clickText(page, 'Preview')
    await page.locator('.poll-opt').first().click()
    await expect(page.locator('.poll-opt.on').first()).toBeVisible()
    await page.reload()
    await expect(page.locator('.poll-opt.on').first()).toBeVisible()
  })

  test('22 mixtape block renders without a tape', async ({ page }) => {
    await openNewIssue(page, 'tape hop')
    await insertSlash(page, 'tape')
    await dropNow(page)
    await clickText(page, 'Preview')
    await expect(page.locator('.audio-block')).toContainText(/no tape loaded/i)
  })

  test('23 sealed midnight run stays folded', async ({ page }) => {
    await page.goto('/explore')
    const card = page.locator('.zine-card').filter({ hasText: /midnight run/i }).first()
    await expect(card).toContainText(/NEXT ISSUE/i)
    await card.getByRole('link', { name: /Peek|Read/i }).click()
    await expect(page.locator('.drop-lock')).toBeVisible()
    await expect(page.locator('.drop-lock')).toContainText(/sealed|folded/i)
    await expect(page.getByLabel('Letters')).toHaveCount(0)
    await expect(page.getByLabel('Blurbs')).toHaveCount(0)
  })

  test('24 corpse invite shows last page only when API is up', async ({ page, browser }) => {
    await openNewIssue(page, 'chain hop')
    await clickIncludes(page, 'Drop issue')
    await page.locator('[role="dialog"] .tray-item', { hasText: 'exquisite corpse' }).click()
    await clickText(page, 'Drop now')
    await clickText(page, 'Preview')
    await clickIncludes(page, 'More on this issue')
    const copy = page.getByRole('button', { name: /Copy corpse link/i })
    await expect(copy).toBeVisible()
    await copy.click()
    const copied = await page.evaluate(async () => {
      try {
        return await navigator.clipboard.readText()
      } catch {
        return ''
      }
    })
    const path = copied.match(/\/z\/[^?\s]+(?:\?chain=[^&\s]+)?/)?.[0]
    test.skip(!path, 'clipboard did not yield a corpse link')
    const ctx = await browser.newContext()
    const other = await ctx.newPage()
    await fresh(other)
    await other.goto(path!)
    if (await other.locator('.chain-peek').count()) {
      await expect(other.locator('.chain-peek')).toContainText(/last page only/i)
      await expect(other.locator('textarea[placeholder="add the next page"]')).toBeVisible()
      await other.getByRole('button', { name: 'Pass it on' }).click()
    } else {
      await expect(other.locator('h1, .preview-page, .drop-lock')).toBeVisible()
    }
    await ctx.close()
  })

  test('missing issue fallback', async ({ page }) => {
    await page.goto('/z/no-such-issue')
    await expect(page.locator('h1')).toContainText('missing issue')
    await page.getByRole('link', { name: 'Back to stream' }).click()
    await expect(page).toHaveURL(/\/explore/)
  })

  test('widget round-trip on the reader including blackout holes', async ({ page }) => {
    await openNewIssue(page, 'round trip')
    for (const slash of ['panel', 'scribble', 'glitch', 'stack', 'quote', 'strip', 'colophon', 'blackout', 'toc', 'insert']) {
      await insertSlash(page, slash)
    }
    await expect(page.locator('.grid-block').first()).toBeVisible()
    await expect(page.locator('.glitch-block')).toBeVisible()
    await dropNow(page)
    await clickText(page, 'Preview')
    await expect(page.locator('.heading-xl, .heading-lg, .heading-md').first()).toBeVisible()
    await expect(page.locator('.sticker-block').first()).toBeVisible()
    await expect(page.locator('.hero-shot').first()).toBeVisible()
    await expect(page.locator('.grid-block').first()).toBeVisible()
    await expect(page.locator('.glitch-block')).toBeVisible()
    await expect(page.locator('.stack-block')).toBeVisible()
    await expect(page.locator('.quote-block')).toBeVisible()
    await expect(page.locator('.strip-block')).toBeVisible()
    await expect(page.locator('.colophon-block')).toBeVisible()
    await expect(page.locator('.contents-block')).toBeVisible()
    await expect(page.locator('.insert-block')).toBeVisible()
    await expect(page.locator('.blackout-block .blackout-word.hid').first()).toHaveText('████')
  })

  test('own after-hours reader has edit, other issue does not', async ({ page }) => {
    await page.goto('/')
    await clickIncludes(page, 'Read after hours')
    await expect(page.locator('.issue-actions').getByRole('link', { name: 'Edit' })).toBeVisible()
    await page.goto('/explore')
    await readIssue(page, /sunday market/i)
    await expect(page.locator('.issue-actions').getByRole('link', { name: 'Edit' })).toHaveCount(0)
  })
})
