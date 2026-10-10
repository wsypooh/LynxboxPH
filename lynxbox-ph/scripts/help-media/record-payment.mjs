// Topic: "Record a payment" (docs: content/help/payments-and-ledger.md)
// Usage: HELP_DEMO_EMAIL=... HELP_DEMO_PASSWORD=... node scripts/help-media/record-payment.mjs
// Non-destructive: fills the payment form but cancels instead of submitting.
// Also writes out/record-payment.json: { trimStart, marks } so the loading time can be trimmed
// off the video and narration lines can be synced to each step (see narration/record-payment.md).
import fs from 'fs'
import path from 'path'
import { execFileSync } from 'child_process'
import { VIEWPORT, requireCreds, loginState, openFramed, moveTo, pause, launch } from './frame.mjs'

const root = path.resolve(import.meta.dirname, '../..')
const imgDir = path.join(root, 'public/help-images')
const outDir = path.join(root, 'scripts/help-media/out')
fs.mkdirSync(imgDir, { recursive: true })
fs.mkdirSync(outDir, { recursive: true })

const creds = requireCreds()
const browser = await launch()
const storageState = await loginState(browser, creds)

const ctx = await browser.newContext({
  viewport: VIEWPORT,
  storageState,
  recordVideo: { dir: outDir, size: VIEWPORT },
})
const t0 = Date.now()
const elapsed = () => (Date.now() - t0) / 1000
let trimStart = 0
const marks = {}
const mark = name => { marks[name] = +(elapsed() - trimStart).toFixed(2) }

const { page, app } = await openFramed(ctx, '/dashboard/tenants')
const shot = name => page.screenshot({ path: path.join(imgDir, `record-payment-${name}.png`) })

// 1. Tenants list (everything before this is page loading and gets trimmed)
await app.getByRole('table').first().waitFor({ timeout: 30000 })
trimStart = Math.max(0, elapsed() - 0.3)
mark('start')
await pause(page, 2500)

// 2. Hover the Record Payment icon
const payBtn = app.getByRole('button', { name: 'Record payment' }).first()
if (!(await payBtn.count())) throw new Error('No tenant with a Record Payment action found in the demo account.')
mark('icon')
await moveTo(page, payBtn)
await pause(page, 2200)
await shot('1-icon')

// 3. Open the dialog
await moveTo(page, payBtn, { click: true })
const dialog = app.getByRole('dialog')
await dialog.waitFor()
mark('dialog')
await pause(page, 3000)

// 4. Fill it in (not submitted)
const amount = dialog.locator('input').first()
mark('amount')
await moveTo(page, amount, { click: true })
await amount.pressSequentially('35840', { delay: 150 })
await pause(page, 1500)
const method = dialog.locator('select').first()
mark('method')
await moveTo(page, method)
await method.selectOption({ label: 'Check' })
await pause(page, 2500)
mark('note')
await moveTo(page, dialog.locator('textarea'), { click: true })
await dialog.locator('textarea').pressSequentially('Check no. 000123', { delay: 80 })
await pause(page, 2000)
await shot('2-form')

// 5. Cancel so no real payment is recorded
mark('cancel')
await moveTo(page, dialog.getByRole('button', { name: 'Cancel' }), { click: true })
await pause(page, 1500)

const video = page.video()
await ctx.close()
const webm = await video.path()
const mp4 = path.join(outDir, 'record-payment.mp4')
execFileSync('ffmpeg', ['-y', '-i', webm, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4], { stdio: 'ignore' })
fs.rmSync(webm)
fs.writeFileSync(path.join(outDir, 'record-payment.json'), JSON.stringify({ trimStart: +trimStart.toFixed(2), marks }, null, 2))
await browser.close()
console.log('Screenshots ->', imgDir)
console.log('Video       ->', mp4, `(trim first ${trimStart.toFixed(1)}s)`)
console.log('Marks       ->', JSON.stringify(marks))
