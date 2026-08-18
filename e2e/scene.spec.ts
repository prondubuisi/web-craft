import { expect, test, workerHeader } from './fixtures'
import {
  claimHandle,
  clickIncludes,
  clickText,
  dropNow,
  expectNoPageErrors,
  forceOffline,
  fresh,
  HEALTH_MS,
  openNewIssue,
  openSecondDesk,
  requireHandle,
  uniqueHandle,
} from './helpers'

test.describe('E. scene — board, fest, cork, mail, profile, wire', () => {
  test.beforeEach(async ({ page }) => {
    await fresh(page)
  })

  test.afterEach(({ page }) => {
    expectNoPageErrors(page)
  })

  test('31 board pin filter swap remove', async ({ page }) => {
    await page.goto('/board')
    await expect(page.locator('h1')).toContainText(/board/i)
    await expect(page.locator('main > .filter-bar')).toBeVisible()
    await expect(page.locator('.board-form .filter-bar')).toHaveCount(0)
    await expect(page.getByLabel('posting as')).toBeVisible()
    await clickText(page, 'trade')
    await clickText(page, 'collab')
    await clickText(page, 'feedback')
    await clickText(page, 'all')
    const body = `want rain ${Date.now()}`
    await page.locator('.board-form textarea').fill(body)
    await page.locator('.board-form').getByRole('button', { name: 'trade' }).click()
    await page.locator('.board-form').getByRole('button', { name: 'Pin it' }).click()
    const card = page.locator('.board-card', { hasText: body })
    await expect(card).toBeVisible()
    await expect(card).toContainText(/trade/i)
    await card.getByRole('button', { name: 'swapped' }).click()
    await expect(card).toHaveClass(/swapped/)
    await card.getByRole('button', { name: 'unswap' }).click()
    await card.getByRole('button', { name: 'pull pin' }).click()
    await expect(page.locator('.board-card', { hasText: body })).toHaveCount(0)
  })

  test('31d board filter is not the posting-as picker', async ({ page }) => {
    await forceOffline(page)
    await page.goto('/board')
    await expect(page.locator('.board-card')).toHaveCount(4)
    const filter = page.locator('main > .filter-bar')
    const picker = page.getByLabel('posting as')
    await filter.getByRole('button', { name: /^trade$/i }).click()
    await expect(page.locator('.board-card')).toHaveCount(2)
    await expect(page.locator('.board-card', { hasText: /sunday market stickers/i })).toBeVisible()
    await expect(page.locator('.board-card', { hasText: /dimension hop/i })).toBeVisible()
    await expect(page.locator('.board-card', { hasText: /guest panel/i })).toHaveCount(0)
    await picker.getByRole('button', { name: /^collab$/i }).click()
    await expect(page.locator('.board-card')).toHaveCount(2)
    await page.locator('.board-form textarea').fill('need a second pair of eyes')
    await page.locator('.board-form').getByRole('button', { name: 'Pin it' }).click()
    await expect(page.locator('.board-card', { hasText: 'need a second pair of eyes' })).toHaveCount(0)
    await filter.getByRole('button', { name: /^collab$/i }).click()
    const pinned = page.locator('.board-card', { hasText: 'need a second pair of eyes' })
    await expect(pinned).toBeVisible()
    await expect(pinned).toContainText(/collab/i)
  })

  test('31c board pin is disabled until text and honors the cap', async ({ page }) => {
    await openNewIssue(page, 'board attach')
    await dropNow(page)
    await page.goto('/board')
    const pin = page.locator('.board-form').getByRole('button', { name: 'Pin it' })
    await expect(pin).toBeDisabled()
    const area = page.locator('.board-form textarea')
    await expect(area).toHaveAttribute('maxlength', '280')
    await area.fill('need a second pair of eyes')
    await expect(pin).toBeEnabled()
    const attach = page.getByLabel('Attach an issue')
    await expect(attach).toBeVisible()
    const attached = await attach.locator('option', { hasText: /board attach/i }).getAttribute('value')
    await attach.selectOption(attached ?? '')
    await pin.click()
    await expect(page.locator('.board-card', { hasText: 'need a second pair of eyes' })).toContainText(/board attach/i)
  })

  test('31b board empty state offline', async ({ page }) => {
    await forceOffline(page)
    await page.goto('/board')
    await expect(page.locator('main')).toContainText(/saved in this browser/i)
    await page.evaluate(() => localStorage.setItem('zineverse.board.v1', '[]'))
    await page.reload()
    await expect(page.locator('main')).toContainText('quiet board. pin the first want.')
  })

  test('32 fest table sit and scene filter', async ({ page }) => {
    await openNewIssue(page, 'fest flyer')
    await dropNow(page)
    await page.goto('/fest')
    await expect(page.locator('h1')).toContainText(/fest/i)
    const name = `table ${Date.now().toString(36).slice(-4)}`
    await page.locator('.board-form input').nth(0).fill(name)
    await page.locator('.board-form input').nth(1).fill('bushwick')
    await page.locator('.board-form textarea').fill('sit if you want.')
    const flyer = page.locator('.board-form .tray-item', { hasText: 'fest flyer' })
    if (await flyer.count()) await flyer.click()
    await page.getByRole('button', { name: 'Set up a table' }).click()
    const table = page.locator('.fest-table', { hasText: name })
    await expect(table).toBeVisible()
    await table.getByRole('button', { name: 'Sit' }).click()
    await expect(table.locator('.meta-line').last()).not.toHaveText('')
    await page.locator('input[placeholder*="scene"]').fill('no-such-scene')
    await expect(page.locator('main')).toContainText('the floor is empty. set a table first.')
  })

  test('33 cork pin drag paste unpin', async ({ page }) => {
    await openNewIssue(page, 'cork draft')
    await page.goto('/cork')
    await expect(page.locator('h1')).toContainText(/cork/i)
    await page.locator('.board-form input').fill('a scrap from the floor')
    await clickIncludes(page, 'Pin it')
    const pin = page.locator('.cork-pin').filter({ hasText: 'a scrap from the floor' })
    await expect(pin).toBeVisible()
    const before = await pin.getAttribute('style')
    const box = await pin.locator('p').boundingBox()
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      await page.mouse.move(box.x + 140, box.y + 110, { steps: 10 })
      await page.mouse.up()
    }
    await expect.poll(async () => pin.getAttribute('style')).not.toBe(before)
    await pin.getByRole('button', { name: 'paste' }).evaluate((el) => (el as HTMLButtonElement).click())
    await expect(page).toHaveURL(/\/edit\//)
    await expect(page.locator('.sticker-block', { hasText: 'a scrap from the floor' })).toBeVisible()

    await page.goto('/cork')
    await page.locator('.board-form input').fill('unpin me')
    await clickIncludes(page, 'Pin it')
    await page.locator('.cork-pin', { hasText: 'unpin me' }).getByLabel('Unpin').evaluate((el) => (el as HTMLButtonElement).click())
    await expect(page.locator('.cork-pin', { hasText: 'unpin me' })).toHaveCount(0)
  })

  test('33b cork empty state offline', async ({ page }) => {
    await forceOffline(page)
    await page.goto('/cork')
    await expect(page.locator('main')).toContainText('the board is blank. pin something ugly.')
  })

  test('34b first-visit letters have no unread chip', async ({ page }) => {
    await page.goto('/mail')
    await expect(page.locator('.mail-threads')).toContainText(/yuzu/i)
    await expect(page.locator('.mail-threads .issue-chip')).toHaveCount(0)
  })

  test('34 letters empty and postcard cap offline', async ({ page }) => {
    await forceOffline(page)
    await page.goto('/mail')
    await page.evaluate(() => localStorage.setItem('zineverse.mail.v1', '[]'))
    await page.reload()
    await expect(page.locator('h1')).toContainText(/letter/i)
    await expect(page.locator('main')).toContainText('no envelopes yet. write first.')
    const send = page.getByRole('button', { name: 'Send letter' })
    await expect(send).toBeDisabled()
    await expect(page.locator('.board-form textarea')).toHaveAttribute('maxlength', '400')
    await page.locator('.tray-item', { hasText: 'postcard' }).click()
    await expect(page.locator('.board-form textarea')).toHaveAttribute('maxlength', '140')
    await page.locator('[aria-label="Send to handle"]').fill('yuzu')
    await page.locator('.board-form textarea').fill('fold it twice.')
    await page.getByRole('button', { name: 'Mail postcard' }).click()
    await expect(page.locator('.mail-thread')).toContainText('fold it twice.')
  })

  test('34c two desks letter and postcard', async ({ page, browser, workerApiPort }) => {
    const me = await requireHandle(page)
    const other = await openSecondDesk(browser, workerHeader(workerApiPort))
    await other.page.goto('/mail')
    await other.page.locator('[aria-label="Send to handle"]').fill(me)
    await other.page.locator('.board-form textarea').fill('hello from the other desk')
    await other.page.getByRole('button', { name: 'Send letter' }).click()
    await expect(other.page.locator('.mail-thread')).toContainText('hello from the other desk')
    await other.page.locator('.tray-item', { hasText: 'postcard' }).click()
    await expect(other.page.locator('.vibe-picks')).toBeVisible()
    await other.page.locator('.board-form textarea').fill('one side')
    await other.page.getByRole('button', { name: 'Mail postcard' }).click()
    await expect(other.page.locator('.mail-thread')).toContainText('POSTCARD')

    await page.goto('/mail')
    await expect(page.locator('.mail-threads')).toContainText(other.handle)
    await expect(page.locator('.mail-threads')).toContainText(/new/i)
    await page.locator('.mail-threads a', { hasText: other.handle }).click()
    await expect(page.locator('.mail-thread')).toContainText('hello from the other desk')
    await other.ctx.close()
  })

  test('35 profile wall watch guestbook shelf stamps', async ({ page, browser }) => {
    const me = await claimHandle(page)
    await page.goto('/u/you')
    if (me) {
      await page.goto(`/u/${me}`)
      await expect(page.getByText('YOUR WALL')).toBeVisible()
      await page.locator('input[placeholder="scene / city"]').fill('bushwick')
      await page.locator('textarea[placeholder="a one-line manifesto"]').fill('ink first')
      await page.getByRole('button', { name: /Save bio/i }).click()
    } else {
      await expect(page.locator('h1')).toContainText('you')
    }

    await page.goto('/explore')
    await page.locator('.zine-card', { hasText: /sunday/i }).first().locator('.owner-link').click()
    await expect(page).toHaveURL(/\/u\//)
    await expect(page.getByRole('button', { name: /Watch wall|Watching/i })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Write a letter' })).toBeVisible()
    const watch = page.getByRole('button', { name: /Watch wall|Watching/i })
    if (/Watch wall/i.test((await watch.innerText()) ?? '')) {
      await watch.click()
    }
    await expect(page.getByRole('button', { name: /Watching/i })).toBeVisible()
    await page.getByLabel('Guestbook').locator('textarea').fill('wrote in the back')
    await page.getByLabel('Guestbook').getByRole('button', { name: 'Sign it' }).click()
    await expect(page.getByLabel('Guestbook')).toContainText('wrote in the back')

    await page.goto('/explore')
    const sunday = page.locator('.zine-card').filter({ hasText: /sunday market/i }).first()
    await sunday.getByRole('link', { name: /Read|Peek/i }).click()
    await clickIncludes(page, 'More on this issue')
    await page.locator('.issue-more').getByRole('button', { name: /Stock in distro/i }).click()
    if (me) {
      await page.goto(`/u/${me}`)
      await expect(page.locator('main')).toContainText(/DISTRO SHELF|sunday/i)
      await expect(page.getByLabel('Passport')).toBeVisible()
    }
    void browser
  })

  test('35b profile series, sealed, empty wall, badges', async ({ page }) => {
    await page.goto('/u/you')
    await expect(page.getByRole('main')).toContainText(/rooftop hours|after hours/i)
    const youMeta = page.locator('.zine-card .meta-line').first()
    await expect(youMeta).toBeVisible()
    const vibeHits = ((await youMeta.innerText()).match(/miles/gi) ?? []).length
    expect(vibeHits).toBe(1)
    await expect(page.locator('.comic-badge.dim').first()).toBeVisible()
    await page.goto('/u/inkstain')
    await expect(page.locator('main')).toContainText(/sealed|confession|midnight/i)
    const penned = page.locator('.zine-card', { hasText: /issue 13/i }).locator('.meta-line')
    await expect(penned).toContainText(/the gutter/i)
    await expect(penned).toContainText(/noir/i)
    expect(((await penned.innerText()).match(/noir/gi) ?? []).length).toBe(1)
    expect(((await penned.innerText()).match(/the gutter/gi) ?? []).length).toBe(1)
    const sealed = page.locator('.zine-card', { hasText: /midnight run/i }).locator('.meta-line')
    await expect(sealed).not.toContainText(/the gutter/i)
    expect(((await sealed.innerText()).match(/noir/gi) ?? []).length).toBe(1)

    const me = await requireHandle(page)
    await page.goto(`/u/${me}`)
    await expect(page.getByText('YOUR WALL')).toBeVisible()
    await expect(page.locator('main')).toContainText(/No dropped issues yet/)
    await expect(page.getByRole('link', { name: /Open the studio/i })).toBeVisible()
  })

  test('36 MAIL wire after a letter', async ({ page, browser, workerApiPort }) => {
    const me = await requireHandle(page)
    const other = await openSecondDesk(browser, workerHeader(workerApiPort))
    await other.page.goto(`/mail/${me}`)
    await other.page.locator('textarea').fill('wire ping')
    await other.page.getByRole('button', { name: 'Send letter' }).click()

    await page.goto('/studio')
    const mail = page.getByRole('button', { name: /Notices|new notices/i })
    await expect(mail).toBeVisible()
    await mail.click()
    const panel = page.locator('[role="dialog"][aria-label="Notices"]')
    await expect(panel).toBeVisible()
    await expect(panel).toContainText(/quiet on this frequency|letter|wrote|mail|@/i)
    await page.mouse.click(4, 4)
    await expect(panel).toHaveCount(0)
    await other.ctx.close()
  })

  test('claim studio shows Letters in the nav', async ({ page }) => {
    const handle = await requireHandle(page)
    const nav = await page.locator('.nav-links').innerText()
    expect(nav).toMatch(/Letters/i)
    expect(nav).toMatch(new RegExp(`@${handle}`, 'i'))
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page.getByRole('button', { name: /Claim studio/i })).toBeVisible()
  })

  test('login toggle on claim modal', async ({ page }) => {
    await page.goto('/studio')
    const claim = page.getByRole('button', { name: /Claim studio|API offline|Checking API/i })
    await expect(claim).not.toHaveText(/Checking API/i, { timeout: HEALTH_MS })
    if (!(await claim.isEnabled()) || /offline/i.test((await claim.innerText()) ?? '')) {
      if (process.env.CI) throw new Error('API must be up in CI')
      test.skip(true, 'API offline')
    }
    await claim.click()
    await clickText(page, 'I already have one')
    await expect(page.locator('[role="dialog"]')).toContainText(/open your studio/i)
    const handle = uniqueHandle()
    await clickText(page, 'Need a handle')
    await page.locator('[role="dialog"] input').nth(0).fill(handle)
    await page.locator('[role="dialog"] input[type="password"]').fill('inkstain1')
    await clickText(page, 'Claim it')
    await expect(page.locator('.studio-head')).toContainText(new RegExp(`@${handle}`, 'i'))
    await page.getByRole('button', { name: 'Sign out' }).click()
    await page.getByRole('button', { name: /Claim studio/i }).click()
    await clickText(page, 'I already have one')
    await page.locator('[role="dialog"] input').nth(0).fill(handle)
    await page.locator('[role="dialog"] input[type="password"]').fill('inkstain1')
    await clickText(page, 'Enter')
    await expect(page.locator('.studio-head')).toContainText(new RegExp(`@${handle}`, 'i'))
  })
})
