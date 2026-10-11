export default {
  startPath: '/dashboard/invoices',
  async steps({ app, ready, mark, click, hover, shot, pause }) {
    await ready(app.locator('tbody tr').first())
    mark('open')
    await click(app.getByRole('button', { name: 'View invoice' }).first(), 0)
    await app.getByRole('tab', { name: 'Statement' }).waitFor({ timeout: 30000 })
    await pause(2000)
    mark('actions')
    await hover(app.getByRole('button', { name: 'Download PDF' }))
    await pause(2000)
    mark('statement')
    await click(app.getByRole('tab', { name: 'Statement' }), 2500)
    await shot('statement')
    mark('totals')
    await hover(app.getByText(/total due/i).locator('visible=true').first())
    await pause(2500)
  },
}
