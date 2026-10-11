import { chromium } from '@playwright/test'

export const BASE_URL = (process.env.HELP_BASE_URL || 'https://sandbox.lynxbox.ph').replace(/\/$/, '')
export const DISPLAY_HOST = 'lynxbox.ph'
export const VIEWPORT = { width: 1280, height: 800 }
const BAR_H = 44

export function requireCreds() {
  const email = process.env.HELP_DEMO_EMAIL
  const password = process.env.HELP_DEMO_PASSWORD
  if (!email || !password) {
    console.error('Set HELP_DEMO_EMAIL and HELP_DEMO_PASSWORD (and optionally HELP_BASE_URL) first.')
    process.exit(1)
  }
  return { email, password }
}

// Log in once (no recording) and return the saved browser state for reuse.
export async function loginState(browser, { email, password }) {
  const ctx = await browser.newContext({ viewport: VIEWPORT })
  const page = await ctx.newPage()
  await page.goto(`${BASE_URL}/auth/signin`)
  await page.getByPlaceholder('Enter your email').fill(email)
  await page.getByPlaceholder('Enter your password').fill(password)
  await page.locator('form button[type="submit"]').click()
  await page.waitForURL(/\/dashboard/, { timeout: 30000 })
  const state = await ctx.storageState()
  await ctx.close()
  return state
}

const HOST_HTML = (startPath) => `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;height:100%;overflow:hidden;background:#fff;font-family:Segoe UI,system-ui,sans-serif}
#bar{height:${BAR_H}px;background:#dee1e6;display:flex;align-items:center;padding:0 12px;gap:12px;border-bottom:1px solid #c4c7cc}
.dots{display:flex;gap:7px}.dots i{width:12px;height:12px;border-radius:50%;display:block}
#url{flex:1;max-width:760px;margin:0 auto;background:#fff;border-radius:16px;height:28px;line-height:28px;padding:0 14px;font-size:13px;color:#3c4043;white-space:nowrap;overflow:hidden}
#app{position:absolute;top:${BAR_H}px;left:0;width:100%;height:calc(100% - ${BAR_H}px);border:0}
#cursor{position:absolute;z-index:99999;width:22px;height:22px;border-radius:50%;background:rgba(255,193,7,.55);border:2px solid #f59f00;pointer-events:none;transform:translate(-50%,-50%);transition:left .6s ease,top .6s ease;left:-50px;top:-50px}
</style></head><body>
<div id="bar"><div class="dots"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i></div><div id="url">https://${DISPLAY_HOST}</div></div>
<iframe id="app" src="${startPath}"></iframe><div id="cursor"></div>
<script>
const f=document.getElementById('app'),u=document.getElementById('url');
setInterval(()=>{try{const l=f.contentWindow.location;u.textContent='https://${DISPLAY_HOST}'+l.pathname+l.search}catch(e){}},300)
</script></body></html>`

// Opens a page that shows the app inside a fake browser frame (address bar reads lynxbox.ph).
export async function openFramed(context, startPath = '/dashboard') {
  const page = await context.newPage()
  await page.route('**/__frame', route =>
    route.fulfill({ status: 200, contentType: 'text/html', body: HOST_HTML(startPath) }))
  // Strip headers that would block embedding the app in the frame.
  await page.route('**/*', async route => {
    const req = route.request()
    if (req.resourceType() !== 'document' || req.url().endsWith('/__frame')) return route.fallback()
    const res = await route.fetch()
    const headers = { ...res.headers() }
    delete headers['x-frame-options']
    if (headers['content-security-policy']) {
      headers['content-security-policy'] = headers['content-security-policy'].replace(/frame-ancestors[^;]*;?/i, '')
    }
    await route.fulfill({ response: res, headers })
  })
  await page.goto(`${BASE_URL}/__frame`)
  return { page, app: page.frameLocator('#app') }
}

export async function pause(page, ms = 1200) {
  await page.waitForTimeout(ms)
}

// Glide the visible cursor to an element, then click (or just hover).
export async function moveTo(page, locator, { click = false } = {}) {
  await locator.waitFor({ state: 'visible' })
  await locator.scrollIntoViewIfNeeded()
  const box = await locator.boundingBox()
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.evaluate(([x, y]) => {
    const c = document.getElementById('cursor')
    c.style.left = x + 'px'
    c.style.top = y + 'px'
  }, [x, y])
  await page.waitForTimeout(750)
  if (click) await locator.click()
  else await locator.hover()
}

export async function launch(opts = {}) {
  return chromium.launch({ headless: true, ...opts })
}
