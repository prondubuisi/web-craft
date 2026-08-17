import { expect, test } from '@playwright/test'
import {
  clickIncludes,
  encodeShareToken,
  expectNoPageErrors,
  fresh,
} from './helpers'

test.describe('F. snapshot, studio rail, print proxies', () => {
  test.beforeEach(async ({ page }) => {
    await fresh(page)
  })

  test.afterEach(({ page }) => {
    expectNoPageErrors(page)
  })

  test('37 good snapshot unpacks and hash change updates', async ({ page }) => {
    await page.goto('/')
    await clickIncludes(page, 'Read after hours')
    await clickIncludes(page, 'More on this issue')
    await clickIncludes(page, 'Copy snapshot')
    const first = await page.evaluate(async () => {
      try {
        return await navigator.clipboard.readText()
      } catch {
        return ''
      }
    })
    const hash1 = first.includes('#') ? first.slice(first.indexOf('#') + 1) : ''
    test.skip(!hash1, 'clipboard not available in this chrome channel')

    await page.goto('/explore')
    await page.locator('.zine-card').filter({ hasText: /sunday market/i }).first().getByRole('link', { name: /Read|Peek/i }).click()
    await clickIncludes(page, 'More on this issue')
    await clickIncludes(page, 'Copy snapshot')
    const second = await page.evaluate(async () => {
      try {
        return await navigator.clipboard.readText()
      } catch {
        return ''
      }
    })
    const hash2 = second.includes('#') ? second.slice(second.indexOf('#') + 1) : ''

    await page.goto(`/s#${hash1}`)
    await expect(page.locator('article.zine-page')).toContainText(/after hours|rooftop|portable/i)
    if (hash2 && hash2 !== hash1) {
      await page.evaluate((h) => {
        window.location.hash = h
      }, hash2)
      await expect(page.locator('article.zine-page')).toContainText(/sunday|booth|portable/i)
    }
    await page.getByRole('button', { name: 'Remix into studio' }).click()
    await expect(page).toHaveURL(/\/edit\//)
    await expect(page.locator('.title-input')).toHaveValue(/remix|after hours|sunday/i)
  })

  test('38 broken snapshot recovery', async ({ page }) => {
    await page.goto('/s#not-a-zine')
    await expect(page.locator('h1')).toContainText('broken snapshot')
    await page.getByRole('link', { name: 'Back to stream' }).click()
    await expect(page).toHaveURL(/\/explore/)
  })

  test('38b sealed snapshot has no unlock form', async ({ page }) => {
    const token = encodeShareToken({
      v: 1,
      title: 'future scrap',
      vibe: 'noir',
      owner: '@inkstain',
      dropsAt: Date.now() + 86400_000,
      blocks: [{ id: 'b1', type: 'heading', text: 'do not open', size: 'xl' }],
    })
    await page.goto(`/s#${token}`)
    await expect(page.locator('.drop-lock')).toContainText(/still sealed/i)
    await expect(page.locator('input[type="password"]')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Remix into studio' })).toBeVisible()
  })

  test('39 studio community rail opens a seed', async ({ page }) => {
    await page.goto('/studio')
    await expect(page.getByRole('heading', { name: /community stream/i })).toBeVisible()
    await page.locator('aside .stream-item').first().getByRole('link', { name: /open|read/i }).click()
    await expect(page).toHaveURL(/\/z\//)
    await expect(page.locator('.preview-page')).toBeVisible()
  })

  test('40 help CTAs from glossary', async ({ page }) => {
    await page.goto('/help')
    await page.getByRole('link', { name: 'Open the studio' }).click()
    await expect(page).toHaveURL(/\/studio/)
    await page.goto('/help')
    await page.getByRole('link', { name: 'The stream' }).click()
    await expect(page).toHaveURL(/\/explore/)
  })
})
