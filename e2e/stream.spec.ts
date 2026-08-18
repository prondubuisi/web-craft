import { expect, test } from './fixtures'
import { clickIncludes, clickText, expectNoPageErrors, fresh, requireApi } from './helpers'

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
    await page.getByRole('group', { name: 'vibe' }).getByRole('button', { name: /Peni/i }).click()
    await expect
      .poll(async () =>
        (await page.locator('.zine-card .meta-line').allTextContents()).every((t) => /peni/i.test(t)),
      )
      .toBe(true)
    await page.getByRole('group', { name: 'lane' }).getByRole('button', { name: /^all$/i }).click()
    await page.getByRole('group', { name: 'sort' }).getByRole('button', { name: /^likes$/i }).click()
    await expect(page.locator('.zine-card').first()).toBeVisible()
    await page.getByRole('group', { name: 'sort' }).getByRole('button', { name: /^remixes$/i }).click()
    await expect(page.locator('.zine-card').first()).toBeVisible()
    const tag = page.getByRole('group', { name: 'tags' }).getByRole('button').first()
    if (await tag.count()) {
      await tag.click()
      await expect(page.locator('.zine-card').first()).toBeVisible()
    }
  })

  test('25b stream filters sit in lane vibe sort tag clusters', async ({ page }) => {
    await page.goto('/explore')
    const lane = page.getByRole('group', { name: 'lane' })
    const vibe = page.getByRole('group', { name: 'vibe' })
    const sort = page.getByRole('group', { name: 'sort' })
    await expect(lane.getByRole('button', { name: /^watching$/i })).toBeVisible()
    await expect(vibe.getByRole('button', { name: /Miles/i })).toBeVisible()
    await expect(sort.getByRole('button', { name: /^new$/i })).toBeVisible()
    const tags = page.getByRole('group', { name: 'tags' })
    if (await tags.count()) {
      await expect(tags.getByRole('button').first()).toContainText('#')
    }
    const peni = vibe.getByRole('button', { name: /Peni/i })
    await peni.click()
    await expect(peni).toHaveClass(/on/)
    const bg = await peni.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(bg).not.toMatch(/rgb\(255,\s*255,\s*255\)/)
    const laneBox = await lane.boundingBox()
    const vibeBox = await vibe.boundingBox()
    const sortBox = await sort.boundingBox()
    expect(laneBox && vibeBox && sortBox).toBeTruthy()
    const beside = (a: { x: number; width: number; y: number; height: number }, b: typeof a) =>
      b.x >= a.x + a.width - 2 || b.y >= a.y + a.height - 2
    expect(beside(laneBox!, vibeBox!)).toBe(true)
    expect(beside(vibeBox!, sortBox!)).toBe(true)

    await page.setViewportSize({ width: 390, height: 844 })
    await expect(lane).toBeVisible()
    await expect(vibe).toBeVisible()
    await expect(sort).toBeVisible()
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
    await requireApi(page)
    await page.goto('/explore')
    const scene = page.locator('.scene-links')
    await expect(scene).toBeVisible({ timeout: 6_000 })
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
