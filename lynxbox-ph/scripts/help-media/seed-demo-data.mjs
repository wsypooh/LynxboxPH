// Seeds a small set of FAKE data (1 building, 3 tenants) into the demo account so help
// screenshots have something to show. Safe to re-run: skips anything already there.
// Usage: HELP_DEMO_EMAIL=... HELP_DEMO_PASSWORD=... node scripts/help-media/seed-demo-data.mjs
import { BASE_URL, VIEWPORT, requireCreds, loginState, launch } from './frame.mjs'

const BUILDING_NAME = 'Sample Tower'
const TENANTS = [
  { lesseeName: 'Juan Dela Cruz Trading', floor: '2', roomNumber: '201', area: 45, defaultRent: 32000, contactEmail: 'juan@example.com', contactPhone: '+63 917 000 0001' },
  { lesseeName: 'Maria Santos Bakeshop', floor: '1', roomNumber: '102', area: 30, defaultRent: 24000, contactEmail: 'maria@example.com', contactPhone: '+63 917 000 0002' },
  { lesseeName: 'Cebu Digital Solutions Inc.', floor: '3', roomNumber: '305', area: 80, defaultRent: 56000, contactEmail: 'hello@example.com', contactPhone: '+63 917 000 0003' },
]

const browser = await launch()
const state = await loginState(browser, requireCreds())
const ctx = await browser.newContext({ viewport: VIEWPORT, storageState: state })
const page = await ctx.newPage()

// Learn the API host and auth headers from the app's own first API call.
const apiCall = page.waitForRequest(r => /\/api\/(buildings|tenants)/.test(r.url()), { timeout: 30000 })
await page.goto(`${BASE_URL}/dashboard/buildings`)
const sample = await apiCall
const apiBase = sample.url().split('/api/')[0]
const headers = { ...sample.headers(), 'content-type': 'application/json' }
for (const h of ['host', 'content-length', 'origin', 'referer', 'user-agent', 'accept-encoding']) delete headers[h]

async function api(method, path, data) {
  const res = await ctx.request.fetch(`${apiBase}${path}`, { method, headers, data: data ? JSON.stringify(data) : undefined })
  const body = await res.json().catch(() => ({}))
  if (!res.ok()) throw new Error(`${method} ${path} -> ${res.status()}: ${JSON.stringify(body).slice(0, 300)}`)
  return body.data ?? body
}

const { buildings } = await api('GET', '/api/buildings')
let building = buildings.find(b => b.name === BUILDING_NAME)
if (!building) {
  const created = await api('POST', '/api/buildings', {
    name: BUILDING_NAME,
    address: '123 Sample Avenue, Makati City, Metro Manila',
    phone: '+63 2 8000 0000',
    email: 'admin@sampletower.example.com',
    currentElectricityRate: 12.5,
    vatRate: 0.12,
    withholdingTaxRate: 0.05,
    penaltyRate: 0.05,
  })
  building = created.building
  console.log('Created building:', building.name)
} else {
  console.log('Building already exists:', building.name)
}

const existing = (await api('GET', '/api/tenants')).tenants.filter(t => t.buildingId === building.id)
for (const t of TENANTS) {
  if (existing.some(e => e.lesseeName === t.lesseeName)) { console.log('Tenant exists:', t.lesseeName); continue }
  await api('POST', '/api/tenants', {
    ...t,
    buildingId: building.id,
    vatEnabled: true,
    withholdingTaxEnabled: false,
    electricityMode: 'metered',
    waterMode: 'fixed',
    defaultFixedWater: 500,
    penaltyEnabled: true,
    status: 'active',
    contracts: [{ startDate: '2026-01-01', endDate: '2027-01-01', rentAmount: t.defaultRent, deposit: t.defaultRent * 2 }],
  })
  console.log('Created tenant:', t.lesseeName)
}
// Give the first tenant one unpaid charge so payment dialogs show a real outstanding balance.
const first = (await api('GET', '/api/tenants')).tenants.find(t => t.buildingId === building.id && t.lesseeName === TENANTS[0].lesseeName)
const ledger = await api('GET', `/api/tenants/${first.id}/ledger`)
if (ledger.charges.length === 0) {
  await api('POST', '/api/ledger/charges', {
    tenantId: first.id,
    billingMonth: '2026-09',
    principalAmount: 35840,
    description: 'Rent - September 2026',
  })
  console.log('Created charge for:', first.lesseeName)
}
await browser.close()
