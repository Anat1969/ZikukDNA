// End-to-end check against `vite preview` with every Supabase call mocked.
// Clicks every button, tab and card; verifies the requests sent; checks mobile overflow,
// PWA installability and console errors; saves screenshots to tests/shots.
import { chromium } from 'playwright-core'
import { spawn } from 'child_process'
import fs from 'fs'

const PORT = process.env.PORT || '4173'
const BASE = `http://localhost:${PORT}`
const SB = 'https://ktqmwpbzcnzkhjskqisy.supabase.co'
const PNG = fs.readFileSync('public/icons/icon-512.png')
fs.mkdirSync('tests/shots', { recursive: true })

const G = (o) => ['form', 'material', 'light', 'color', 'movement', 'time'].map((k, i) => ({ key: k, value: `ערך ${k}`, intensity: (o + i * 17) % 100, note: `הערה ${k}` }))
const mk = (n, extra = {}) => ({
  id: `0000000${n}-0000-4000-8000-00000000000${n}`, created_at: `2026-10-1${n}T10:00:00Z`, kind: 'distill', lens: 'אדריכלות',
  title: `גנום ${n}`, source_input: `רעיון ${n}`, distillation: `משפט זיקוק ${n}`, essence: `מהות ${n}`, tension: `בין א ל-ב ${n}`,
  genes: G(n * 11), palette: ['#222222', '#555555', '#999999', '#dddddd'], magic_words: ['זקק', 'חשוף'], description_he: `תיאור ${n}`,
  prompt_he: `פרומפט ${n}, Documentary realism, Professional architecture photography, 1:1 --no text, words, writing, frame divisions`,
  prompt_en: 'x', next_prompt: `המשך ${n}`, image_url: `${SB}/storage/v1/object/public/zikuk-media/dna/${n}.png`, parent_ids: [], published: true, featured: false, ...extra,
})
const fixtures = () => [mk(1, { lens: 'טבע ונוף', featured: true }), mk(2), mk(3, { lens: 'עיר ומרחב' }), mk(4, { kind: 'hybrid', parent_ids: [mk(1).id, mk(2).id] })]

const fail = []
// The A&I logo button is loaded from the portfolio app; serve a local copy when AI_MENU_JS points to one.
const AI_MENU = 'https://appofapp-gh.vercel.app/ai-menu.js'
const openMenu = (page) => page.click('ai-menu .logo')
const item = (page, text) => page.locator('ai-menu .item', { hasText: text }).first()
const menuClick = async (page, text) => { await openMenu(page); await item(page, text).click() }
const check = (cond, msg) => { if (!cond) { fail.push(msg); console.log('  FAIL', msg) } else console.log('  ok  ', msg) }

async function setup(ctx, { admin }) {
  const state = { dnas: fixtures(), calls: [] }
  if (process.env.AI_MENU_JS) await ctx.route(AI_MENU, (r) => r.fulfill({ path: process.env.AI_MENU_JS, contentType: 'application/javascript' }))
  await ctx.route(`${SB}/**`, async (route) => {
    const req = route.request(), url = new URL(req.url()), m = req.method()
    state.calls.push({ m, path: url.pathname + url.search, body: req.postData() })
    const json = (b, s = 200) => route.fulfill({ status: s, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(b) })
    if (m === 'OPTIONS') return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } })
    if (url.pathname.startsWith('/storage/')) return route.fulfill({ status: 200, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' }, body: PNG })
    if (url.pathname === '/auth/v1/settings') return json({ external: { google: false, email: true } })
    if (url.pathname === '/auth/v1/otp') return json({})
    if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204 })
    if (url.pathname === '/rest/v1/zikuk_admins') return json(admin ? [{ email: 'shtanat5@gmail.com' }] : [])
    if (url.pathname === '/rest/v1/zikuk_dnas') {
      const id = url.searchParams.get('id')?.replace('eq.', '')
      if (m === 'GET') return json(state.dnas)
      if (m === 'PATCH') { const d = state.dnas.find((x) => x.id === id); Object.assign(d, JSON.parse(req.postData())); return json(d) }
      if (m === 'DELETE') { state.dnas = state.dnas.filter((x) => x.id !== id); return route.fulfill({ status: 204 }) }
    }
    if (url.pathname === '/functions/v1/zikuk-upload') {
      const body = req.postDataBuffer()?.toString('latin1') ?? ''
      const id = /name="dnaId"\r\n\r\n([0-9a-f-]{36})/.exec(body)?.[1]
      const d = state.dnas.find((x) => x.id === id)
      const removing = body.includes('name="remove"')
      if (d.mj_image_url && !removing && !req.headers()['x-user-token']) return json({ error: 'לגנום הזה כבר יש תמונה' }, 403)
      d.mj_image_url = removing ? null : `${SB}/storage/v1/object/public/zikuk-media/mj/${id}-${Date.now()}.png`
      state.uploads = (state.uploads ?? 0) + 1
      return json({ dna: d })
    }
    if (url.pathname === '/functions/v1/zikuk-distill') {
      const b = JSON.parse(req.postData())
      await new Promise((r) => setTimeout(r, 600))
      const d = mk(9, { id: `00000009-0000-4000-8000-00000000009${state.calls.length % 10}`, kind: b.mode, title: `חדש ${b.mode}`, parent_ids: b.parentIds ?? [], created_at: '2026-10-19T10:00:00Z' })
      state.dnas.unshift(d)
      return json({ dna: d })
    }
    return json({ message: 'unmocked' }, 404)
  })
  if (admin) {
    const exp = Math.floor(Date.now() / 1000) + 3600
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
    const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u1', email: 'shtanat5@gmail.com', exp, role: 'authenticated', aud: 'authenticated' })}.sig`
    const session = { access_token: jwt, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: exp, user: { id: 'u1', email: 'shtanat5@gmail.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} } }
    await ctx.addInitScript((s) => localStorage.setItem('sb-ktqmwpbzcnzkhjskqisy-auth-token', JSON.stringify(s)), session)
  }
  return state
}

async function noHScroll(page, label) {
  const w = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }))
  check(w.s <= w.c + 1, `${label}: no horizontal scroll (${w.s} <= ${w.c})`)
}

const server = spawn('npx', ['vite', 'preview', '--port', PORT, '--strictPort'], { stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 2500))
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })

try {
  // ---------- desktop, visitor ----------
  console.log('desktop / visitor')
  let ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] })
  let st = await setup(ctx, { admin: false })
  let page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  await page.goto(BASE + '/')
  await page.waitForSelector('[data-testid=dna-card]')
  check(await page.locator('[data-testid=dna-card]').count() === 4, 'home lists 4 genomes')
  check(await page.locator('[data-testid=topbar]').isVisible(), 'top bar visible')
  await page.waitForTimeout(1200)
  await page.screenshot({ path: 'tests/shots/home.png' })
  await page.screenshot({ path: 'tests/shots/home-full.png', fullPage: true })

  check(await page.locator('ai-menu .logo').isVisible(), 'A&I logo button in the top bar')
  check(!(await page.locator('header >> text=העתקת קישור').first().isVisible().catch(() => false)), 'no loose development buttons in the bar')
  await menuClick(page, 'העתקת קישור')
  await page.waitForTimeout(300)
  check((await page.evaluate(() => navigator.clipboard.readText())).startsWith(BASE), 'copy link writes URL')
  await page.waitForTimeout(1000)
  await openMenu(page)
  check(await item(page, 'שיחת הפיתוח').getAttribute('href') === 'https://claude.ai/code/session_01PSpgUm8awdgvBVVGzYKP4o', 'dev chat link')
  await page.screenshot({ path: 'tests/shots/menu.png' })

  // lens filter + search keep state in URL
  await page.locator('[data-testid=lens-chip]', { hasText: 'עיר ומרחב' }).click()
  check(await page.locator('[data-testid=dna-card]').count() === 1 && page.url().includes('lens='), 'lens filter narrows and updates URL')
  for (const chip of await page.locator('[data-testid=lens-chip]').all()) await chip.click()
  await page.click('[data-testid=lens-all]')
  await page.fill('[data-testid=search]', 'גנום 2')
  check(await page.locator('[data-testid=dna-card]').count() === 1 && page.url().includes('q='), 'search narrows and updates URL')
  await page.fill('[data-testid=search]', 'אין כזה')
  check(await page.locator('[data-testid=empty]').isVisible(), 'empty state on no match')
  await page.fill('[data-testid=search]', '')

  // featured + card navigation
  await page.click('[data-testid=featured]')
  await page.waitForSelector('[data-testid=dna-page]')
  check(page.url().endsWith(mk(1).id), 'featured opens genome page')
  check(await page.locator('[data-testid=adminbar]').count() === 0, 'no admin bar for visitor')
  await page.waitForTimeout(1200)
  await page.screenshot({ path: 'tests/shots/dna.png' })
  await page.screenshot({ path: 'tests/shots/dna-full.png', fullPage: true })

  // genes tabs
  const genes = page.locator('[data-testid=gene]')
  check(await genes.count() === 6, 'six genes')
  check(await page.locator('[data-testid=mutate-up]').isDisabled(), 'mutation disabled before gene pick')
  for (let i = 0; i < 6; i++) { await genes.nth(i).click(); check(page.url().includes('gene='), `gene ${i} selected into URL`) }
  await page.click('[data-testid=copy-prompt]')
  check((await page.evaluate(() => navigator.clipboard.readText())).includes('--no text'), 'copy prompt')
  await page.click('[data-testid=copy-next]')
  check((await page.evaluate(() => navigator.clipboard.readText())).startsWith('המשך'), 'copy next prompt')
  await page.click('[data-testid=copy-source]')

  // studio: upload by file picker, then plate with text, card download, no replace for visitor
  check(await page.locator('[data-testid=mj-drop]').isVisible(), 'drop zone shown when genome has no Midjourney image')
  await page.setInputFiles('[data-testid=mj-input]', { name: 'mj.png', mimeType: 'image/png', buffer: PNG })
  await page.waitForSelector('[data-testid=mj-plate]')
  check(st.uploads === 1, 'file picker uploads')
  check((await page.locator('[data-testid=mj-plate] figcaption').innerText()).includes('משפט זיקוק 1'), 'plate shows the genome text')
  check((await page.getAttribute('.dna-hero-media img', 'src')).includes('/mj/'), 'hero switches to the Midjourney image')
  check(await page.locator('[data-testid=mj-replace]').count() === 0, 'visitor cannot replace an existing image')
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-testid=mj-card]')])
  await dl.saveAs('tests/shots/card.png')
  // headless Chromium reports blob downloads as "download"; check the file itself
  const card = fs.readFileSync('tests/shots/card.png')
  check(card.readUInt32BE(16) === 1080 && card.readUInt32BE(20) === 1350, 'card download is a 1080x1350 PNG')
  await page.locator('[data-testid=studio]').scrollIntoViewIfNeeded()
  await page.waitForTimeout(700)
  await page.screenshot({ path: 'tests/shots/studio.png' })

  // drag and drop, then paste, on two other genomes
  await page.goto(`${BASE}/dna/${mk(2).id}`)
  await page.waitForSelector('[data-testid=mj-drop]')
  const dropped = await page.evaluateHandle(async (b64) => {
    const dt = new DataTransfer()
    dt.items.add(new File([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], 'drop.png', { type: 'image/png' }))
    return dt
  }, PNG.toString('base64'))
  await page.dispatchEvent('[data-testid=mj-drop]', 'dragenter', { dataTransfer: dropped })
  check(await page.locator('.mj-drop.over').count() === 1, 'drag highlights drop zone')
  await page.dispatchEvent('[data-testid=mj-drop]', 'drop', { dataTransfer: dropped })
  await page.waitForSelector('[data-testid=mj-plate]')
  check(st.uploads === 2, 'drag and drop uploads')
  await page.goto(`${BASE}/dna/${mk(3).id}`)
  await page.waitForSelector('[data-testid=mj-drop]')
  await page.evaluate(async (b64) => {
    const dt = new DataTransfer()
    dt.items.add(new File([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], 'paste.png', { type: 'image/png' }))
    window.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }))
  }, PNG.toString('base64'))
  await page.waitForSelector('[data-testid=mj-plate]')
  check(st.uploads === 3, 'paste uploads')
  await page.goto(BASE + '/')
  await page.waitForSelector('[data-testid=dna-card]')
  check(await page.locator('.card-mj').count() === 3, 'cards mark Midjourney images')
  await page.goto(`${BASE}/dna/${mk(1).id}`)
  await page.waitForSelector('[data-testid=dna-page]')
  await genes.nth(0).click()

  // mutation
  await page.click('[data-testid=mutate-up]')
  await page.waitForSelector('[data-testid=distill-overlay]')
  await page.waitForURL(/0000000?9/)
  const mcall = st.calls.find((c) => c.path.includes('zikuk-distill') && c.m === 'POST')
  check(mcall && JSON.parse(mcall.body).mode === 'mutation' && JSON.parse(mcall.body).direction === 'up', 'mutation request body')

  // back to genome 4 (hybrid) shows lineage
  await page.goto(`${BASE}/dna/${mk(4).id}`)
  await page.waitForSelector('[data-testid=dna-page]')
  check(await page.locator('.dna-body [data-testid=dna-card]').count() === 2, 'hybrid shows 2 parents')
  await page.click('[data-testid=to-lab]')
  await page.waitForURL(/\/lab\?a=/)
  check(true, 'to-lab preselects parent')

  // lab
  await page.locator('[data-testid=dna-card] button').nth(1).click()
  check(page.url().includes('b='), 'lab picks second parent')
  check(!(await page.locator('[data-testid=cross]').isDisabled()), 'cross enabled with two parents')
  await page.screenshot({ path: 'tests/shots/lab.png' })
  await page.fill('[data-testid=intent]', 'לבית ספר')
  st.calls.length = 0
  await page.click('[data-testid=cross]')
  await page.waitForURL(/\/dna\//)
  const hcall = st.calls.find((c) => c.path.includes('zikuk-distill'))
  const hb = JSON.parse(hcall.body)
  check(hb.mode === 'hybrid' && hb.parentIds.length === 2 && hb.input === 'לבית ספר', 'hybrid request body')
  await page.goto(BASE + '/lab')
  await page.locator('[data-testid=dna-card] button').nth(0).click()
  await page.locator('[data-testid=dna-card] button').nth(0).click()
  check(!page.url().includes('a='), 'lab deselect')
  await page.locator('[data-testid=dna-card] button').nth(0).click()
  await page.click('[data-testid=clear-lab]')
  check(!page.url().includes('a='), 'lab clear')

  // distill
  await page.click('[data-testid=brand]')
  await page.waitForURL(BASE + '/')
  await page.click('[data-testid=cta-distill]')
  await page.waitForSelector('[data-testid=idea]')
  await page.click('[data-testid=submit-distill]')
  check(await page.locator('[data-testid=distill-error]').isVisible(), 'empty idea shows error')
  for (const s of await page.locator('[data-testid=seed]').all()) await s.click()
  for (const l of await page.locator('[data-testid=lens-pick]').all()) await l.click()
  await page.click('[data-testid=lens-auto]')
  await page.locator('[data-testid=lens-pick]').first().click()
  await page.fill('[data-testid=idea]', 'שקט כחומר בנייה')
  st.calls.length = 0
  await page.click('[data-testid=submit-distill]')
  await page.waitForSelector('[data-testid=distill-overlay]')
  await page.screenshot({ path: 'tests/shots/overlay.png' })
  await page.waitForURL(/\/dna\//)
  const dcall = JSON.parse(st.calls.find((c) => c.path.includes('zikuk-distill')).body)
  check(dcall.mode === 'distill' && dcall.input === 'שקט כחומר בנייה' && dcall.lens === 'אדריכלות', 'distill request body')
  await page.goto(BASE + '/distill')
  await page.screenshot({ path: 'tests/shots/distill.png' })

  // auth modal: Google off -> magic link
  await page.keyboard.press('Escape')
  await menuClick(page, 'כניסה')
  await page.waitForSelector('[data-testid=google-off]')
  check(await page.locator('[data-testid=google]').count() === 0, 'no Google button when provider is off')
  await page.fill('#auth-email', 'a@b.co')
  await page.click('[data-testid=magic]')
  await page.waitForSelector('[data-testid=magic-sent]')
  check(st.calls.some((c) => c.path.startsWith('/auth/v1/otp')), 'magic link request sent')
  await page.click('[data-testid=auth-close]')

  // 404
  await page.goto(BASE + '/nope')
  check(await page.locator('text=הגן הזה לא קיים').isVisible(), '404 page')
  await page.goto(BASE + '/dna/11111111-1111-4111-8111-111111111111')
  await page.waitForSelector('[data-testid=dna-missing] h1')
  check(true, 'missing genome page')

  // installability
  await page.goto(BASE + '/')
  await page.waitForTimeout(1500)
  const relevant = errors.filter((e) => !/favicon|Failed to load resource/.test(e))
  check(relevant.length === 0, `no console errors (${relevant.join(' | ')})`)
  await ctx.close()

  // ---------- desktop, admin ----------
  console.log('desktop / admin')
  ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  st = await setup(ctx, { admin: true })
  page = await ctx.newPage()
  page.on('dialog', (d) => d.accept())
  page.on('pageerror', (e) => check(false, `admin page error: ${e}`))
  await page.goto(`${BASE}/dna/${mk(2).id}`)
  await page.waitForSelector('[data-testid=dna-page]')
  await page.waitForTimeout(800)
  check(await page.locator('.adminbar').count() === 0, 'no floating editor bar')
  await openMenu(page)
  check(await item(page, 'יציאה (אדמין)').waitFor({ timeout: 5000 }).then(() => true, () => false), 'admin recognized')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  check(await page.locator('ai-menu .panel').isHidden(), 'Escape closes system menu')
  await menuClick(page, 'עריכת טקסט')
  await page.locator('[data-testid=edit-title]').evaluate((el) => { el.textContent = 'שם חדש'; el.dispatchEvent(new InputEvent('input', { bubbles: true })) })
  await menuClick(page, 'שמירה')
  await page.waitForSelector('[data-testid=dna-title]')
  const patch = st.calls.find((c) => c.m === 'PATCH')
  check(patch && JSON.parse(patch.body).title === 'שם חדש', 'edit sends PATCH title')
  check(await page.locator('[data-testid=dna-title]').innerText() === 'שם חדש', 'title updated in page')
  await menuClick(page, 'עריכת טקסט'); await menuClick(page, 'ביטול עריכה')
  await page.setInputFiles('[data-testid=mj-input]', { name: 'a.png', mimeType: 'image/png', buffer: PNG })
  await page.waitForSelector('[data-testid=mj-plate]')
  await page.click('[data-testid=mj-replace]')
  await page.waitForSelector('[data-testid=mj-drop]')
  await page.click('[data-testid=mj-cancel]')
  await page.click('[data-testid=mj-replace]')
  await page.setInputFiles('[data-testid=mj-input]', { name: 'b.png', mimeType: 'image/png', buffer: PNG })
  await page.waitForSelector('[data-testid=mj-plate]')
  check(st.uploads === 2, 'admin can replace the image')
  await page.click('[data-testid=mj-remove]')
  await page.waitForSelector('[data-testid=mj-drop]')
  check(true, 'admin can remove the image')
  await menuClick(page, 'הסתרה')
  await page.waitForTimeout(300)
  check(st.calls.filter((c) => c.m === 'PATCH').some((c) => JSON.parse(c.body).published === false), 'hide sends published=false')
  await menuClick(page, 'גנום מוביל')
  await page.waitForTimeout(300)
  check(st.calls.filter((c) => c.m === 'PATCH').some((c) => JSON.parse(c.body).featured === true), 'feature sends featured=true')
  await page.screenshot({ path: 'tests/shots/admin.png' })
  await menuClick(page, 'מחיקת הגנום')
  await page.waitForURL(BASE + '/')
  check(st.calls.some((c) => c.m === 'DELETE'), 'delete sends DELETE')
  await menuClick(page, 'יציאה')
  await page.waitForTimeout(300)
  await openMenu(page)
  await item(page, 'כניסה').waitFor()
  check(true, 'sign out')
  await ctx.close()

  // ---------- mobile ----------
  console.log('mobile')
  ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  st = await setup(ctx, { admin: true })
  page = await ctx.newPage()
  for (const path of ['/', '/distill', '/lab', `/dna/${mk(1).id}`, `/dna/${mk(4).id}`]) {
    await page.goto(BASE + path)
    await page.waitForTimeout(900)
    await noHScroll(page, `mobile ${path}`)
  }
  await page.goto(BASE + '/')
  await page.waitForSelector('[data-testid=dna-card]')
  await page.screenshot({ path: 'tests/shots/m-home.png' })
  check(await page.locator('ai-menu .logo').isVisible(), 'mobile: A&I logo button visible')
  await openMenu(page)
  await item(page, 'העתקת קישור').waitFor()
  await noHScroll(page, 'mobile system menu open')
  await page.screenshot({ path: 'tests/shots/m-menu.png' })
  await page.keyboard.press('Escape')
  await page.locator('.topnav .navlink', { hasText: 'מעבדת הכלאה' }).click()
  await page.waitForURL(/\/lab/)
  check(true, 'mobile nav stays in the top bar')
  await page.goto(`${BASE}/dna/${mk(1).id}`)
  await page.waitForTimeout(800)
  await page.screenshot({ path: 'tests/shots/m-dna.png' })
  await page.screenshot({ path: 'tests/shots/m-dna-full.png', fullPage: true })
  await noHScroll(page, 'mobile dna with admin bar')
  await ctx.close()

  // ---------- installability (needs a non-incognito profile) ----------
  console.log('installability')
  const prof = fs.mkdtempSync('/tmp/claude-0/zk-prof-')
  const pctx = await chromium.launchPersistentContext(prof, { executablePath: '/opt/pw-browsers/chromium' })
  await setup(pctx, { admin: false })
  const ppage = pctx.pages()[0] ?? await pctx.newPage()
  await ppage.goto(BASE + '/')
  await ppage.waitForTimeout(2500)
  const inst = await (await pctx.newCDPSession(ppage)).send('Page.getInstallabilityErrors')
  check(inst.installabilityErrors.length === 0, `installable (${JSON.stringify(inst.installabilityErrors)})`)
  check(await ppage.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())), 'service worker registered')
  await pctx.close()
} finally {
  await browser.close()
  server.kill()
}
console.log(fail.length ? `\n${fail.length} FAILED` : '\nALL PASSED')
process.exit(fail.length ? 1 : 0)
