// Runs help-media topics: each topic in ./topics/<name>.mjs gets a framed, recorded browser,
// writes screenshots to public/help-images/, a trimmed silent video to public/help-videos/,
// and out/<name>.json (trimStart + step marks used by narration/<name>.md).
// Usage: node scripts/help-media/run.mjs [topic ...]     (no args = every topic)
// Env:   HELP_DEMO_EMAIL, HELP_DEMO_PASSWORD, optional HELP_BASE_URL (default sandbox)
// Topics are non-destructive: forms are filled but cancelled, never submitted.
import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
import { execFileSync } from 'child_process'
import { VIEWPORT, requireCreds, loginState, openFramed, moveTo, pause, launch } from './frame.mjs'

const here = import.meta.dirname
const root = path.resolve(here, '../..')
const imgDir = path.join(root, 'public/help-images')
const outDir = path.join(here, 'out')
const topicsDir = path.join(here, 'topics')
fs.mkdirSync(imgDir, { recursive: true })
fs.mkdirSync(outDir, { recursive: true })

const available = fs.readdirSync(topicsDir).filter(f => f.endsWith('.mjs')).map(f => f.replace(/\.mjs$/, ''))
const requested = process.argv.slice(2)
const unknown = requested.filter(n => !available.includes(n))
if (unknown.length) { console.error('Unknown topic(s):', unknown.join(', '), '\nAvailable:', available.join(', ')); process.exit(1) }
const selected = requested.length ? requested : available

const creds = requireCreds()
const browser = await launch()
let authState = null
const failures = []

async function runTopic(name) {
  const topic = (await import(pathToFileURL(path.join(topicsDir, `${name}.mjs`)).href)).default
  const needsAuth = topic.auth !== false
  if (needsAuth && !authState) authState = await loginState(browser, creds)

  for (const f of fs.readdirSync(imgDir)) if (f.startsWith(`${name}-`)) fs.rmSync(path.join(imgDir, f))
  const videoDir = path.join(outDir, `tmp-${name}`)
  fs.rmSync(videoDir, { recursive: true, force: true })

  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    ...(needsAuth ? { storageState: authState } : {}),
    recordVideo: { dir: videoDir, size: VIEWPORT },
  })
  const t0 = Date.now()
  const elapsed = () => (Date.now() - t0) / 1000
  let trimStart = 0
  const marks = {}
  let seq = 0

  try {
    const { page, app } = await openFramed(ctx, topic.startPath)
    const h = {
      page, app, pause: ms => pause(page, ms),
      mark: step => { marks[step] = +(elapsed() - trimStart).toFixed(2) },
      // Wait until the page has really loaded, then cut everything before it from the video.
      async ready(locator) {
        await locator.waitFor({ timeout: 45000 })
        await pause(page, 1500)
        trimStart = elapsed()
        h.mark('start')
        await pause(page, 4000)
      },
      shot: label => { seq++; return page.screenshot({ path: path.join(imgDir, `${name}-${label}.png`) }) },
      hover: locator => moveTo(page, locator),
      // Scroll a section to the top of its scrolling container (page or modal body).
      async scrollTop(locator, wait = 800) {
        await locator.evaluate(el => el.scrollIntoView({ block: 'start' }))
        await pause(page, wait)
      },
      async click(locator, wait = 1200) { await moveTo(page, locator, { click: true }); await pause(page, wait) },
      async type(locator, text, { replace = false, delay = 70, wait = 500 } = {}) {
        await moveTo(page, locator, { click: true })
        if (replace) await locator.fill('')
        await locator.pressSequentially(text, { delay })
        await pause(page, wait)
      },
      async choose(select, option, wait = 700) {
        await moveTo(page, select)
        await select.selectOption(option)
        await pause(page, wait)
      },
    }
    await topic.steps(h)
    await pause(page, 1200)

    const video = page.video()
    await ctx.close()
    const webm = await video.path()
    const mp4 = path.join(outDir, `${name}.mp4`)
    execFileSync('ffmpeg', ['-y', '-i', webm, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4], { stdio: 'ignore' })
    fs.rmSync(videoDir, { recursive: true, force: true })
    fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify({ trimStart: +trimStart.toFixed(2), marks }, null, 2))
    execFileSync('node', [path.join(here, 'finalize-video.mjs'), name], { stdio: 'inherit' })
    console.log(`OK ${name}: ${seq} screenshot(s), marks ${JSON.stringify(marks)}`)
  } catch (err) {
    await ctx.close().catch(() => {})
    fs.rmSync(videoDir, { recursive: true, force: true })
    throw err
  }
}

for (const name of selected) {
  try { await runTopic(name) } catch (e) { failures.push(name); console.error(`FAILED ${name}: ${String(e.message).split('\n').slice(0, 4).join(' | ')}`) }
}
await browser.close()
if (failures.length) { console.error('\nFailed topics:', failures.join(', ')); process.exit(1) }
