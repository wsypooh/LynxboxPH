export default {
  startPath: '/dashboard/tenants',
  async steps({ app, ready, mark, hover, click, type, choose, shot, pause }) {
    await ready(app.getByRole('table').first())
    const payBtn = app.getByRole('button', { name: 'Record payment' }).first()
    mark('icon')
    await hover(payBtn)
    await pause(2200)
    await shot('icon')
    await click(payBtn, 0)
    const dialog = app.getByRole('dialog')
    await dialog.waitFor()
    mark('dialog')
    await pause(3000)
    mark('amount')
    await type(dialog.locator('input').first(), '35840', { delay: 150, wait: 1500 })
    mark('method')
    await choose(dialog.locator('select').first(), { label: 'Check' }, 2500)
    mark('note')
    await type(dialog.locator('textarea'), 'Check no. 000123', { wait: 2000 })
    await shot('form')
    mark('cancel')
    await click(dialog.getByRole('button', { name: 'Cancel' }), 1500)
  },
}
