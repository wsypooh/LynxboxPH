export default {
  startPath: '/dashboard/tenants',
  async steps({ app, ready, mark, click, hover, scrollTop, shot, pause }) {
    await ready(app.getByRole('table').first())
    mark('open')
    await click(app.getByRole('button', { name: 'View tenant' }).first(), 0)
    const ledger = app.getByRole('heading', { name: /Ledger/ }).first()
    await ledger.waitFor({ timeout: 30000 })
    await pause(2000)
    mark('ledger')
    await hover(ledger)
    await scrollTop(ledger, 2500)
    await shot('ledger')
    mark('payment')
    await hover(app.getByRole('button', { name: 'Record Payment' }))
    await pause(2500)
  },
}
