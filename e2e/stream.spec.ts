import { expect, test } from '@playwright/test'
import { clickIncludes, clickText, expectNoPageErrors, fresh } from './helpers'

test.describe('D. stream, jam, archive', () => {
  test.beforeEach(async ({ page }) => {
    await fresh(page)
  })

  test.afterEach(({ page }) => {
    expectNoPageErrors(page)
  })

  test('25 search vibe sort and tags', async ({ page }) => {
    await page.goto('/explore')
    await expect(page.locator('.zine-card').first()).toBeVisible()
    await page.getByLabel('Search the stream').fill('sunday')
    await expect
      .poll(async () =>
        (await page.locator('.zine-card h3').allTextContents()).every((t) => /sunday/i.test(t)),
      )
      .toBe(true)
    await page.getByLabel('Search the stream').fill('')
    await page.locator('.filter-bar .tray-item', { hasText: 'Peni' }).click()
    await expect
      .poll(async () =>
        (await page.locator('.zine-card .meta-line').allTextContents()).every((t) => /peni/i.test(t)),
      )
      .toBe(true)
    await page.locator('.filter-bar .tray-item', { hasText: 'all' }).click()
    await page.locator('.filter-bar .tray-item', { hasText: 'likes' }).click()
    await expect(page.locator('.zine-card').first()).toBeVisible()
    await page.locator('.filter-bar .tray-item', { hasText: 'remixes' }).click()
    await expect(page.locator('.zine-card').first()).toBeVisible()
    const tag = page.locator('.filter-bar .tray-item', { hasText: '#' }).first()
    if (await tag.count()) {
      await tag.click()
      await expect(page.locator('.zine-card').first()).toBeVisible()
    }
  })

  test('26 lanes: watching empty, jam, archive', async ({ page }) => {
    await page.goto('/explore')
    await clickText(page, 'watching')
    await expect(page.locator('main')).toContainText(/Nothing in this lane yet|watching/i)
    await clickText(page, 'jam')
    await expect(page.locator('main')).toContainText(/sunday market|toner week/i)
    await clickText(page, 'archive')
    await expect(page.locator('main')).toBeVisible()
    await clickText(page, 'all')
    await expect(page.locator('.zine-card').first()).toBeVisible()
  })

  test('27 pull from the pile lands on a live issue', async ({ page }) => {
    await page.goto('/explore')
    await clickIncludes(page, 'Pull from the pile')
    await expect(page).toHaveURL(/\/z\//)
    await expect(page.locator('.preview-page, .drop-lock, h1')).toBeVisible()
  })

  test('28 remix from a stream card', async ({ page }) => {
    await page.goto('/explore')
    await page.locator('.zine-card').first().getByRole('button', { name: 'Remix' }).click()
    await expect(page.locator('.title-input')).toHaveValue(/remix/i)
  })

  test('29 jam page and unknown id fallback', async ({ page }) => {
    await page.goto('/explore')
    await expect(page.locator('main')).toContainText(/toner week/i)
    await page.goto('/jam/toner-week')
    await expect(page.getByText(/LIVE JAM|CLOSED JAM/)).toBeVisible()
    await expect(page.locator('h1')).toContainText(/toner week/i)
    await expect(page.locator('main')).toContainText(/one-pager|6 blocks/i)
    await page.getByRole('link', { name: 'Enter the jam' }).click()
    await expect(page).toHaveURL(/\/studio/)

    await page.goto('/jam/nope')
    await expect(page.locator('h1')).toContainText(/toner week|that jam folded/i)
  })

  test('30 scene hop when API is up', async ({ page }) => {
    await page.goto('/explore')
    const scene = page.locator('.scene-links')
    try {
      await expect(scene).toBeVisible({ timeout: 6_000 })
    } catch {
      test.skip(true, 'API offline — no scene links')
    }
    await scene.getByRole('link', { name: 'Board' }).click()
    await expect(page.locator('main')).toContainText(/board|trade/i)
    await page.goto('/explore')
    await page.locator('.scene-links').getByRole('link', { name: 'Fest' }).click()
    await expect(page.locator('h1')).toContainText(/fest/i)
    await page.goto('/explore')
    await page.locator('.scene-links').getByRole('link', { name: 'Desk' }).click()
    await expect(page.locator('h1')).toContainText(/cork/i)
  })

  test('empty lane copy', async ({ page }) => {
    await page.goto('/explore')
    await page.getByLabel('Search the stream').fill('zzzz-no-such-zine')
    await expect(page.locator('main')).toContainText('Nothing in this lane yet. Try another vibe.')
  })
})
