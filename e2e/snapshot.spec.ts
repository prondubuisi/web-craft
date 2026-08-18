import { expect, test } from './fixtures'
import {
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
    const hash1 = encodeShareToken({
      v: 1,
      title: 'after hours / bushwick',
      vibe: 'miles',
      owner: 'you',
      dropsAt: Date.now() - 1000,
      blocks: [{ id: 'b1', type: 'heading', text: 'after hours / rooftop', size: 'xl' }],
    })
    const hash2 = encodeShareToken({
      v: 1,
      title: 'sunday market',
      vibe: 'peni',
      owner: '@yuzu',
      dropsAt: Date.now() - 1000,
      blocks: [{ id: 'b2', type: 'heading', text: 'sunday booth notes', size: 'xl' }],
    })
    await page.goto(`/s#${hash1}`)
    await expect(page.locator('article.zine-page')).toContainText(/after hours|rooftop/i)
    await page.evaluate((h) => {
      window.location.hash = h
    }, hash2)
    await expect(page.locator('article.zine-page')).toContainText(/sunday|booth/i)
    await page.getByRole('button', { name: 'Remix into studio' }).click()
    await expect(page).toHaveURL(/\/edit\//)
    await expect(page.locator('.title-input')).toHaveValue(/remix|sunday/i)
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

})
