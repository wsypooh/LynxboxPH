export default {
  startPath: '/dashboard/tenants',
  async steps({ app, ready, mark, click, type, choose, hover, scrollTop, shot, pause }) {
    await ready(app.getByRole('table').first())
    mark('add')
    await click(app.getByRole('button', { name: '+ Add Tenant' }), 800)
    const dialog = app.getByRole('dialog')
    await dialog.waitFor()
    await pause(1500)
    mark('unit')
    await choose(dialog.locator('select[name="buildingId"]'), { label: 'Sample Tower' })
    await type(dialog.getByPlaceholder('e.g. 3F'), '4F')
    await type(dialog.getByPlaceholder('e.g. Rm 10'), 'Rm 410', { wait: 1200 })
    await shot('unit')
    mark('lessee')
    await type(dialog.getByPlaceholder('Full name or company'), 'Green Leaf Cafe')
    await type(dialog.getByPlaceholder('email@example.com'), 'greenleaf@example.com')
    await type(dialog.getByPlaceholder('09XX-XXX-XXXX'), '0917-000-0004', { wait: 1200 })
    mark('billing')
    await scrollTop(dialog.getByRole('heading', { name: 'Billing Defaults' }), 1200)
    await type(dialog.getByLabel('Default Monthly Rent (₱)'), '28000', { replace: true, wait: 1500 })
    await hover(dialog.getByText('Penalty Enabled'))
    await pause(1200)
    await shot('billing')
    mark('cancel')
    await click(dialog.getByRole('button', { name: 'Cancel' }), 1200)
  },
}
