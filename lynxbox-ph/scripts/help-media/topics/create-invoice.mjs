export default {
  startPath: '/dashboard/invoices',
  async steps({ app, ready, mark, click, choose, hover, shot, pause }) {
    await ready(app.getByRole('button', { name: '+ New Invoice' }))
    mark('new')
    await click(app.getByRole('button', { name: '+ New Invoice' }), 0)
    await app.locator('select[name="tenantId"]').waitFor({ timeout: 30000 })
    await pause(1500)
    mark('tenant')
    await choose(app.locator('select[name="tenantId"]'), { index: 1 }, 1500)
    const month = app.locator('input[name="billingMonth"]')
    await hover(month)
    await month.fill('2026-11')
    await pause(1500)
    mark('rent')
    await hover(app.getByRole('heading', { name: 'Rent & Tax' }))
    await pause(2000)
    mark('utilities')
    await hover(app.getByRole('heading', { name: 'Electricity' }))
    await pause(2500)
    mark('summary')
    await hover(app.getByRole('heading', { name: 'Summary' }))
    await pause(2500)
    await shot('summary')
    mark('cancel')
    await click(app.getByRole('button', { name: 'Cancel' }), 1500)
  },
}
