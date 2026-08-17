import { expect, test } from '@playwright/test'
import {
  claimHandle,
  expectNoPageErrors,
  fresh,
  openNewIssue,
} from './helpers'

const PRIMARY = ['Cover', 'Studio', 'Stream', 'Help'] as const

test.describe('topbar', () => {
  test.beforeEach(async ({ page }) => {
    await fresh(page)
  })

  test.afterEach(({ page }) => {
    expectNoPageErrors(page)
  })

  test('primary destinations hop and mark the current route', async ({ page }) => {
    await page.goto('/')
    const nav = page.locator('nav[aria-label="Primary"]')
    await expect(nav).toBeVisible()
    await expect(page.locator('.brand')).toHaveAttribute(
      'aria-label',
      /Zineverse, (checking|local|api live|@)/i,
    )
    await expect(page.locator('.brand small')).toHaveText(/local|api live|@/i, { timeout: 15_000 })

    await nav.getByRole('link', { name: 'Studio', exact: true }).click()
    await expect(page).toHaveURL(/\/studio/)
    await expect(nav.getByRole('link', { name: 'Studio', exact: true })).toHaveClass(/active/)

    await nav.getByRole('link', { name: 'Stream', exact: true }).click()
    await expect(page).toHaveURL(/\/explore/)
    await expect(nav.getByRole('link', { name: 'Stream', exact: true })).toHaveClass(/active/)

    await nav.getByRole('link', { name: 'Help', exact: true }).click()
    await expect(page).toHaveURL(/\/help/)
    await expect(nav.getByRole('link', { name: 'Help', exact: true })).toHaveClass(/active/)

    await nav.getByRole('link', { name: 'Cover', exact: true }).click()
    await expect(page).toHaveURL(/\/$|\/index/)
    await expect(nav.getByRole('link', { name: 'Cover', exact: true })).toHaveClass(/active/)

    await page.locator('.brand').click()
    await expect(page).toHaveURL(/\/$|\/index/)
  })

  test('guest nav has no Letters or handle', async ({ page }) => {
    await page.goto('/studio')
    const nav = page.locator('nav[aria-label="Primary"]')
    await expect(nav.getByRole('link', { name: 'Letters' })).toHaveCount(0)
    await expect(nav.locator('a[href^="/u/"]')).toHaveCount(0)
  })

  test('signed-in nav adds Letters and the handle', async ({ page }) => {
    const handle = await claimHandle(page)
    test.skip(!handle, 'API offline')
    const nav = page.locator('nav[aria-label="Primary"]')
    await expect(nav.getByRole('link', { name: 'Letters' })).toBeVisible()
    await nav.getByRole('link', { name: 'Letters' }).click()
    await expect(page).toHaveURL(/\/mail/)
    await nav.getByRole('link', { name: new RegExp(`@${handle}`, 'i') }).click()
    await expect(page).toHaveURL(new RegExp(`/u/${handle}`, 'i'))
  })

  test('editor has no topbar and hops back through studio', async ({ page }) => {
    await openNewIssue(page, 'nav hop')
    await expect(page.locator('.topbar')).toHaveCount(0)
    await expect(page.locator('.editor-bar').getByRole('link', { name: /studio/i })).toBeVisible()
    await page.locator('.editor-bar').getByRole('link', { name: /studio/i }).click()
    await expect(page).toHaveURL(/\/studio/)
    await expect(page.locator('.nav-links').getByRole('link', { name: 'Stream', exact: true })).toBeVisible()
  })

  test('MAIL closes on click outside', async ({ page }) => {
    await page.goto('/studio')
    await page.getByRole('button', { name: /new notices|Notices/i }).click()
    const panel = page.locator('[role="dialog"][aria-label="Notices"]')
    await expect(panel).toBeVisible()
    await page.locator('#main').click({ position: { x: 24, y: 200 } })
    await expect(panel).toBeHidden()
  })

  test('MAIL notice link leaves the wire', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /new notices|Notices/i }).click()
    const panel = page.locator('[role="dialog"][aria-label="Notices"]')
    await expect(panel.locator('li a').first()).toBeVisible()
    await panel.locator('li a').first().click()
    await expect(panel).toBeHidden()
    await expect(page).not.toHaveURL(/\/$/)
  })

  test('phone nav keeps every primary destination on screen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    const nav = page.locator('nav[aria-label="Primary"]')
    for (const name of PRIMARY) {
      const link = nav.getByRole('link', { name, exact: true })
      await expect(link).toBeVisible()
      const box = await link.boundingBox()
      expect(box, name).toBeTruthy()
      expect(box!.x + box!.width, name).toBeLessThanOrEqual(390 + 1)
      expect(box!.y, name).toBeGreaterThanOrEqual(0)
    }
    const mail = page.getByRole('button', { name: /new notices|Notices/i })
    await expect(mail).toBeVisible()
    const mailBox = await mail.boundingBox()
    expect(mailBox).toBeTruthy()
    expect(mailBox!.x + mailBox!.width).toBeLessThanOrEqual(390 + 1)
    await mail.click()
    await expect(page.locator('[role="dialog"][aria-label="Notices"]')).toBeVisible()
    await expect(page.getByRole('button', { name: 'close' })).toBeVisible()
  })
})
