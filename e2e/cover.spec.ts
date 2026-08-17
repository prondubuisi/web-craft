import { expect, test } from '@playwright/test'
import {
  clickIncludes,
  clickText,
  expectNoPageErrors,
  forceOffline,
  fresh,
  GLOSSARY,
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
    await expect(page.locator('.brand small')).toHaveText(/local|api live|@/i, { timeout: 15_000 })
  })

  test('3 offline honesty vs live scene links', async ({ page }) => {
    await forceOffline(page)
    await page.goto('/')
    await expect(page.locator('.local-note')).toContainText(/Local studio/i, { timeout: 15_000 })
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
    await page.getByRole('link', { name: 'Open the studio' }).click()
    await expect(page).toHaveURL(/\/studio/)
    await page.goto('/help')
    await page.getByRole('link', { name: 'The stream' }).click()
    await expect(page).toHaveURL(/\/explore/)
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

  test('nav chrome is on every top-level route', async ({ page }) => {
    for (const path of ['/', '/studio', '/help', '/explore', '/board', '/fest', '/cork', '/mail']) {
      await page.goto(path)
      const nav = page.locator('.nav-links')
      await expect(nav.getByRole('link', { name: 'Cover', exact: true })).toBeVisible()
      await expect(nav.getByRole('link', { name: 'Studio', exact: true })).toBeVisible()
      await expect(nav.getByRole('link', { name: 'Stream', exact: true })).toBeVisible()
      await expect(nav.getByRole('link', { name: 'Help', exact: true })).toBeVisible()
      expect(await nav.innerText()).not.toMatch(/\bBoard\b/)
    }
  })

  test('MAIL wire hot unread then marks read', async ({ page }) => {
    await page.goto('/')
    const mail = page.getByRole('button', { name: /new notices|Notices/i })
    await expect(mail).toHaveClass(/hot/)
    await expect(page.locator('.inbox-count')).toBeVisible()
    await mail.click()
    const panel = page.locator('[role="dialog"][aria-label="Notices"]')
    await expect(panel).toBeVisible()
    await expect(panel.locator('li').first()).toBeVisible()
    await expect(page.locator('.inbox-btn.hot')).toHaveCount(0)
    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()
    await mail.click()
    await expect(panel).toBeVisible()
    await page.getByRole('button', { name: 'close' }).click()
    await expect(panel).toBeHidden()
  })
})
