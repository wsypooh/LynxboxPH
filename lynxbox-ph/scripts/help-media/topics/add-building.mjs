export default {
  startPath: '/dashboard/buildings',
  async steps({ app, ready, mark, click, type, shot, pause }) {
    await ready(app.getByRole('button', { name: '+ Add Building' }))
    mark('add')
    await click(app.getByRole('button', { name: '+ Add Building' }), 800)
    const dialog = app.getByRole('dialog')
    await dialog.waitFor()
    await pause(1500)
    mark('details')
    await type(dialog.getByLabel('Building Name'), 'Riverside Plaza')
    await type(dialog.getByLabel('Address'), '45 Rizal Street, Quezon City')
    await type(dialog.getByLabel('Phone'), '+63 2 8123 4567', { wait: 1200 })
    mark('rates')
    await type(dialog.getByLabel('Electricity Rate (₱/kWh)'), '12.50', { replace: true })
    await type(dialog.getByLabel('Penalty Rate (%)'), '5', { replace: true, wait: 1500 })
    await shot('rates')
    mark('cancel')
    await click(dialog.getByRole('button', { name: 'Cancel' }), 1200)
  },
}
