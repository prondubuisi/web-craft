import { expect, test } from './fixtures'
import {
  clickIncludes,
  clickText,
  expectNoPageErrors,
  forceOffline,
  fresh,
  GLOSSARY,
  HEALTH_MS,
} from './helpers'

test.describe('A. first visit / readable chrome', () => {
  test.beforeEach(async ({ page }) => {
    await fresh(page)
  })

  test.afterEach(({ page }) => {
    expectNoPageErrors(page)
  })

  test('1 primer dismisses and stays dismissed', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.primer')).toContainText('Make an issue')
    await expect(page.locator('.primer')).toContainText('Print it. Pass it.')
    await expect(page.locator('.primer')).toContainText('Remix the pile')
    await page.locator('.primer').getByRole('link', { name: 'Glossary' }).click()
    await expect(page.locator('h1')).toContainText('what the words mean')
    await page.goto('/')
    await expect(page.locator('.primer')).toBeVisible()
    await clickText(page, 'Got it')
    await expect(page.locator('.primer')).toHaveCount(0)
    await page.reload()
    await expect(page.locator('.primer')).toHaveCount(0)
  })

  test('2 collapsed nav excludes scene destinations', async ({ page }) => {
    await page.goto('/')
    const nav = await page.locator('.nav-links').innerText()
    expect(nav).toMatch(/Cover/i)
    expect(nav).toMatch(/Studio/i)
    expect(nav).toMatch(/Stream/i)
    expect(nav).toMatch(/Help/i)
    expect(nav).toMatch(/MAIL/)
    expect(nav).not.toMatch(/\bBoard\b/)
    expect(nav).not.toMatch(/\bFest\b/)
    expect(nav).not.toMatch(/\bDesk\b/)
    await expect(page.locator('.brand small')).toHaveText(/local|api live|@/i, { timeout: HEALTH_MS })
  })

  test('3 offline honesty vs live scene links', async ({ page }) => {
    await forceOffline(page)
    await page.goto('/')
    await expect(page.locator('.local-note')).toContainText(/Local studio/i, { timeout: HEALTH_MS })
    await expect(page.locator('.local-note a')).toHaveAttribute('href', /help/)
    await page.goto('/explore')
    await expect(page.locator('.scene-links')).toHaveCount(0)

    await page.unroute('**/api/**')
    await page.goto('/')
    const online = await page
      .locator('.brand small')
      .textContent()
      .then((t) => /api live|@/i.test(t ?? ''))
    if (online) {
      await expect(page.locator('.local-note')).toHaveCount(0)
      await page.goto('/explore')
      await expect(page.locator('.scene-links')).toContainText(/Board|Fest|Desk/)
    }
  })

  test('4 cover make / studio / vibe / sample', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'One finished issue' })).toBeVisible()
    await clickIncludes(page, 'Make an issue')
    await expect(page).toHaveURL(/\/studio/)
    await expect(page.getByRole('dialog', { name: /new issue/i })).toBeVisible()
    await page.goto('/')
    await clickIncludes(page, 'Enter the studio')
    await expect(page).toHaveURL(/\/studio/)
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.goto('/')
    await page.locator('.vibe-card').nth(2).click()
    await expect(page.locator('[data-vibe="peni"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /Build with Peni/i })).toBeVisible()
    await clickIncludes(page, 'Enter the studio')
    await expect(page.locator('[data-vibe="peni"]')).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.goto('/')
    await page.locator('.vibe-card').nth(2).click()
    await clickIncludes(page, 'Build with Peni')
    await expect(page).toHaveURL(/\/studio/)
    await expect(page.locator('[data-vibe="peni"]')).toBeVisible()
    const create = page.getByRole('dialog', { name: /new issue/i })
    await expect(create).toBeVisible()
    await expect(create.locator('.tray-item.on')).toContainText('Peni')
    await page.goto('/')
    await clickIncludes(page, 'Read after hours')
    await expect(page.locator('.preview-page')).toBeVisible()
    await expect(page.locator('article.zine-page')).toContainText(/after hours/i)
  })

  test('5 help glossary lists every term and routes out', async ({ page }) => {
    await page.goto('/help')
    await expect(page.locator('h1')).toContainText('what the words mean')
    for (const term of GLOSSARY) {
      await expect(page.locator('dt', { hasText: new RegExp(`^${term}$`, 'i') })).toBeVisible()
    }
    const short = page.locator('.help-entry', { has: page.locator('dt', { hasText: /^issue$/i }) })
    await expect.poll(async () => (await short.boundingBox())?.height ?? 999).toBeLessThan(180)
    await page.getByRole('link', { name: 'Open the studio' }).first().click()
    await expect(page).toHaveURL(/\/studio/)
    await page.goto('/help')
    await page.getByRole('link', { name: 'The stream' }).first().click()
    await expect(page).toHaveURL(/\/explore/)
    await page.goto('/help')
    await page.getByRole('link', { name: 'Open the board' }).click()
    await expect(page).toHaveURL(/\/board/)
  })

  test('5b help hops every named resource and leaves silent terms unlinked', async ({ page }) => {
    const hops: { go: string; url: RegExp }[] = [
      { go: 'Pick a vibe', url: /\/$|\/index/ },
      { go: 'Open the fest', url: /\/fest/ },
      { go: 'Open the desk', url: /\/cork/ },
      { go: 'Open letters', url: /\/mail/ },
      { go: 'Your bag lives in studio', url: /\/studio/ },
      { go: 'Claim in the studio', url: /\/studio/ },
    ]
    for (const hop of hops) {
      await page.goto('/help')
      await page.getByRole('link', { name: hop.go }).click()
      await expect(page).toHaveURL(hop.url)
    }
    await page.goto('/help')
    for (const term of ['snapshot', 'blurb', 'margin', 'dedication', 'tear-out', 'b-side', 'corpse']) {
      const entry = page.locator('.help-entry', { has: page.locator('dt', { hasText: new RegExp(`^${term}$`, 'i') }) })
      await expect(entry.locator('a')).toHaveCount(0)
    }
  })

  test('5c help cards stay short on a phone; primer cells keep their floor', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/help')
    const issue = page.locator('.help-entry', { has: page.locator('dt', { hasText: /^issue$/i }) })
    await expect(issue).toHaveCSS('min-height', /^(0px|auto)$/)
    const snapshot = page.locator('.help-entry', { has: page.locator('dt', { hasText: /^snapshot$/i }) })
    await expect(snapshot).toHaveCSS('min-height', /^(0px|auto)$/)
    await page.goto('/')
    const primer = page.locator('.primer .comic-cell').first()
    await expect(primer).toBeVisible()
    const primerMin = await primer.evaluate((el) => parseFloat(getComputedStyle(el).minHeight))
    expect(primerMin).toBeGreaterThanOrEqual(180)
  })

  test('6 404 recovery links work', async ({ page }) => {
    await page.goto('/no-such-dimension')
    await expect(page.locator('.issue-chip')).toContainText(/404/)
    await expect(page.locator('h1')).toContainText('this page tore off')
    await page.locator('main').getByRole('link', { name: 'Cover', exact: true }).click()
    await expect(page).toHaveURL(/\/$|\/index/)
    await page.goto('/no-such-dimension')
    await page.locator('main').getByRole('link', { name: 'Studio', exact: true }).click()
    await expect(page).toHaveURL(/\/studio/)
    await page.goto('/no-such-dimension')
    await page.locator('main').getByRole('link', { name: 'Stream', exact: true }).click()
    await expect(page).toHaveURL(/\/explore/)
  })

  test('7 skip link points at main', async ({ page }) => {
    await page.goto('/')
    const skip = page.locator('.skip-link')
    await expect(skip).toHaveAttribute('href', '#main')
    await expect(page.locator('#main')).toHaveCount(1)
  })

  test('sample issue section is absent without published seeds', async ({ page }) => {
    await forceOffline(page)
    await page.addInitScript(() => {
      const wipe = () => {
        try {
          const raw = localStorage.getItem('zineverse.v1')
          if (!raw) return
          const data = JSON.parse(raw) as { zines?: { published?: boolean }[] }
          if (Array.isArray(data.zines)) {
            data.zines = data.zines.map((z) => ({ ...z, published: false }))
            localStorage.setItem('zineverse.v1', JSON.stringify(data))
          }
        } catch {
          /* ignore */
        }
      }
      wipe()
      window.setTimeout(wipe, 0)
    })
    await page.goto('/')
    await page.evaluate(() => {
      const raw = localStorage.getItem('zineverse.v1')
      if (!raw) return
      const data = JSON.parse(raw) as { zines?: { published?: boolean }[] }
      if (Array.isArray(data.zines)) {
        data.zines = data.zines.map((z) => ({ ...z, published: false }))
        localStorage.setItem('zineverse.v1', JSON.stringify(data))
      }
    })
    await page.reload()
    await expect(page.getByRole('heading', { name: 'One finished issue' })).toHaveCount(0)
  })

  test('nav chrome is on cover, studio, and stream', async ({ page }) => {
    await page.goto('/')
    const nav = page.locator('.nav-links')
    const assertChrome = async () => {
      await expect(nav.getByRole('link', { name: 'Cover', exact: true })).toBeVisible()
      await expect(nav.getByRole('link', { name: 'Studio', exact: true })).toBeVisible()
      await expect(nav.getByRole('link', { name: 'Stream', exact: true })).toBeVisible()
      await expect(nav.getByRole('link', { name: 'Help', exact: true })).toBeVisible()
      expect(await nav.innerText()).not.toMatch(/\bBoard\b/)
    }
    await assertChrome()
    await nav.getByRole('link', { name: 'Studio', exact: true }).click()
    await expect(page).toHaveURL(/\/studio/)
    await assertChrome()
    await nav.getByRole('link', { name: 'Stream', exact: true }).click()
    await expect(page).toHaveURL(/\/explore/)
    await assertChrome()
  })

  test('MAIL first visit is quiet and still has the wire', async ({ page }) => {
    await page.goto('/')
    const mail = page.getByRole('button', { name: /new notices|Notices/i })
    await expect(mail).not.toHaveClass(/hot/)
    await expect(page.locator('.inbox-count')).toHaveCount(0)
    await mail.click()
    const panel = page.locator('[role="dialog"][aria-label="Notices"]')
    await expect(panel).toBeVisible()
    await expect(panel.locator('li').first()).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()
    await page.evaluate(() => {
      const raw = localStorage.getItem('zineverse.notices.v1')
      const notices = raw ? (JSON.parse(raw) as { read?: boolean }[]) : []
      if (notices[0]) notices[0].read = false
      localStorage.setItem('zineverse.notices.v1', JSON.stringify(notices))
    })
    await page.reload()
    await expect(mail).toHaveClass(/hot/)
    await expect(page.locator('.inbox-count')).toBeVisible()
    await mail.click()
    await expect(panel).toBeVisible()
    await expect(page.locator('.inbox-btn.hot')).toHaveCount(0)
    await page.getByRole('button', { name: 'close' }).click()
    await expect(panel).toBeHidden()
  })
})
