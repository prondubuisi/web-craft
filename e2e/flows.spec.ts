import { expect, test, type Page } from '@playwright/test'

const pageErrors: string[] = []

async function fresh(page: Page) {
  pageErrors.length = 0
  page.on('pageerror', (err) => pageErrors.push(err.message))
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !/Failed to load resource|net::ERR/i.test(msg.text())) {
      pageErrors.push(msg.text())
    }
  })
  await page.addInitScript(() => {
    if (sessionStorage.getItem('e2e-cleared')) return
    localStorage.clear()
    sessionStorage.setItem('e2e-cleared', '1')
  })
}

async function clickText(page: Page, text: string) {
  await page
    .locator('a,button,label,span')
    .filter({ hasText: new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i') })
    .first()
    .click()
}

async function clickIncludes(page: Page, text: string) {
  await page
    .locator('a,button,label')
    .filter({ hasText: new RegExp(text, 'i') })
    .first()
    .click()
}

test.describe('user flows', () => {
  test.beforeEach(async ({ page }) => {
    await fresh(page)
  })

  test.afterEach(() => {
    expect(pageErrors, pageErrors.join('\n')).toEqual([])
  })

  test('cover: primer, nav, vibes, sample issue', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toContainText('ZINEVERSE')
    await expect(page.locator('.primer')).toContainText('Make an issue')
    const nav = await page.locator('.nav-links').innerText()
    expect(nav).toMatch(/Cover/i)
    expect(nav).toMatch(/Studio/i)
    expect(nav).toMatch(/Stream/i)
    expect(nav).toMatch(/Help/i)
    expect(nav).not.toMatch(/\bBoard\b/)
    expect(nav).not.toMatch(/\bFest\b/)
    expect(nav).not.toMatch(/\bDesk\b/)
    await clickText(page, 'Got it')
    await expect(page.locator('.primer')).toHaveCount(0)
    await page.locator('.vibe-card').nth(2).click()
    await expect(page.locator('[data-vibe="peni"]')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'One finished issue' })).toBeVisible()
    await clickIncludes(page, 'Read after hours')
    await expect(page.locator('.preview-page')).toBeVisible()
    await expect(page.locator('article.zine-page')).toContainText(/after hours/i)
  })

  test('help glossary and 404', async ({ page }) => {
    await page.goto('/help')
    await expect(page.locator('h1')).toContainText('what the words mean')
    await expect(page.locator('main')).toContainText('snapshot')
    await expect(page.locator('main')).toContainText('scatter')
    await page.goto('/no-such-dimension')
    await expect(page.locator('h1')).toContainText('this page tore off')
  })

  test('make: landing drop → editor slash widgets → undo', async ({ page }) => {
    await page.goto('/')
    await clickIncludes(page, 'Drop a zine')
    await expect(page.locator('.zine-page')).toBeVisible()
    await expect(page.locator('.title-input')).toHaveValue(/miles draft/i)
    await clickIncludes(page, '/sfx')
    await expect(page.locator('.sfx-block')).toBeVisible()
    await page.keyboard.press('/')
    await page.locator('.slash input').fill('quote')
    await page.keyboard.press('Enter')
    await expect(page.locator('.quote-block')).toBeVisible()
    await page.keyboard.press('Meta+z')
    await expect(page.locator('.quote-block')).toHaveCount(0)
  })

  test('editor: scatter toggle and snap control exist', async ({ page }) => {
    await page.goto('/')
    await clickIncludes(page, 'Enter the studio')
    await clickIncludes(page, 'Drop a new issue')
    await page.locator('[role="dialog"] input').fill('scatter hop')
    await clickText(page, 'Open the page')
    await expect(page.locator('.title-input')).toHaveValue('scatter hop')
    await clickText(page, 'scatter')
    await expect(page.locator('.zine-page.scatter')).toBeVisible()
    await clickText(page, 'scatter')
    await expect(page.locator('.zine-page.scatter')).toHaveCount(0)
    await expect(page.locator('label.tray-item', { hasText: 'snap' })).toBeVisible()
  })

  test('drop now and read: like, bag, more sheet', async ({ page }) => {
    await page.goto('/')
    await clickIncludes(page, 'Drop a zine')
    await clickIncludes(page, 'Drop issue')
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    await clickText(page, 'Drop now')
    await expect(page.locator('.drop-toast')).toContainText(/dropped/i)
    await clickText(page, 'Preview')
    await expect(page.locator('.preview-page')).toBeVisible()
    await clickIncludes(page, 'Like')
    await expect(page.locator('.issue-actions')).toContainText(/Liked/i)
    await clickIncludes(page, 'Stuff in bag')
    await expect(page.locator('.issue-actions')).toContainText(/In the bag/i)
    const primary = await page.locator('.issue-actions').innerText()
    expect(primary).not.toMatch(/Nominate|Preview fold|Copy snapshot/)
    await clickIncludes(page, 'More on this issue')
    await expect(page.locator('.issue-more')).toBeVisible()
    await clickText(page, 'Preview fold')
    await expect(page.locator('.fold-wrap.on .fold-sheet')).toBeVisible()
  })

  test('stream: search, jam lane, pull from pile, remix', async ({ page }) => {
    await page.goto('/explore')
    await expect(page.locator('.zine-card').first()).toBeVisible()
    await expect(page.locator('main')).toContainText(/toner week/i)
    await clickText(page, 'jam')
    await expect(page.locator('main')).toContainText(/sunday market|toner week/i)
    await clickText(page, 'all')
    await page.locator('input[type="search"]').fill('sunday')
    await expect
      .poll(async () =>
        (await page.locator('.zine-card h3').allTextContents()).every((t) => /sunday/i.test(t)),
      )
      .toBe(true)
    await page.goto('/explore')
    await page.locator('.zine-card').first().getByRole('button', { name: 'Remix' }).click()
    await expect(page.locator('.title-input')).toHaveValue(/remix/i)
  })

  test('sealed midnight run stays folded', async ({ page }) => {
    await page.goto('/explore')
    const card = page.locator('.zine-card').filter({ hasText: /midnight run/i }).first()
    await expect(card).toContainText(/NEXT ISSUE/i)
    await card.getByRole('link', { name: /Peek|Read/i }).click()
    await expect(page.locator('.drop-lock')).toBeVisible()
    await expect(page.locator('.drop-lock')).toContainText(/sealed|folded/i)
  })

  test('snapshot of a seeded issue unpacks on /s', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('/')
    await clickIncludes(page, 'Read after hours')
    await clickIncludes(page, 'More on this issue')
    await clickIncludes(page, 'Copy snapshot')
    const copied = await page.evaluate(async () => {
      try {
        return await navigator.clipboard.readText()
      } catch {
        return ''
      }
    })
    const hash = copied.includes('#') ? copied.slice(copied.indexOf('#') + 1) : ''
    test.skip(!hash, 'clipboard not available in this chrome channel')
    await page.goto(`/s#${hash}`)
    await expect(page.locator('article.zine-page')).toContainText(/after hours|rooftop|portable/i)
  })

  test('broken snapshot shows a recovery page', async ({ page }) => {
    await page.goto('/s#not-a-zine')
    await expect(page.locator('h1')).toContainText('broken snapshot')
  })

  test('studio bag after stuffing an issue', async ({ page }) => {
    await page.goto('/explore')
    await page.locator('.zine-card').filter({ hasText: /sunday/i }).first().getByRole('link', { name: /Read|Peek/i }).click()
    await clickIncludes(page, 'Stuff in bag')
    await page.goto('/studio')
    await expect(page.locator('main')).toContainText(/in my bag/i)
  })

  test('help from cover and scene links on stream when API is up', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Help', exact: true }).click()
    await expect(page.locator('h1')).toContainText('what the words mean')
    await page.goto('/explore')
    const scene = page.locator('.scene-links')
    if (await scene.count()) {
      await expect(scene).toContainText(/Board|Fest|Desk/)
      await scene.getByRole('link', { name: 'Board' }).click()
      await expect(page.locator('main')).toContainText(/trade|board/i)
    }
  })

  test('mail without a session still renders letters', async ({ page }) => {
    await page.goto('/mail')
    await expect(page.locator('h1')).toContainText(/letter/i)
  })

  test('fest and cork routes still work off the nav', async ({ page }) => {
    await page.goto('/fest')
    await expect(page.locator('h1')).toContainText(/fest/i)
    await page.goto('/cork')
    await expect(page.locator('h1')).toContainText(/cork/i)
    const pin = page.locator('.board-form input')
    if (await pin.count()) {
      await pin.fill('a scrap from the floor')
      await clickIncludes(page, 'Pin it')
      await expect(page.locator('.cork-pin')).toBeVisible()
    }
  })

  test('claim studio registers a handle', async ({ page }) => {
    await page.goto('/studio')
    const claim = page.getByRole('button', { name: /Claim studio/i })
    if (!(await claim.isEnabled())) test.skip(true, 'API offline')
    await claim.click()
    const handle = `pw${Date.now().toString(36).slice(-6)}`
    await page.locator('[role="dialog"] input').nth(0).fill(handle)
    await page.locator('[role="dialog"] input[type="password"]').fill('inkstain1')
    await clickText(page, 'Claim it')
    await expect(page.locator('.studio-head')).toContainText(new RegExp(`@${handle}`, 'i'))
    const nav = await page.locator('.nav-links').innerText()
    expect(nav).toMatch(/Letters/i)
  })

  test('mobile editor opens the widget sheet', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/studio')
    await page.locator('a.zine-card').first().click()
    await expect(page.locator('.fab')).toBeVisible()
    await page.locator('.fab').click()
    await expect(page.locator('.sheet')).toContainText('/sticker')
    await expect(page.locator('.sheet')).toContainText('snap')
  })
})
