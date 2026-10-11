export default {
  startPath: '/dashboard/tenants',
  async steps({ app, ready, mark, click, type, choose, hover, shot, pause }) {
    await ready(app.getByRole('table').first())
    mark('open')
    await click(app.getByRole('button', { name: 'View tenant' }).first(), 0)
    await app.getByRole('heading', { name: 'Documents' }).first().waitFor({ timeout: 30000 })
    await pause(1500)
    mark('documents')
    await hover(app.getByRole('heading', { name: 'Documents' }).first())
    await pause(1500)
    mark('upload')
    await click(app.getByRole('button', { name: '+ Upload Document' }), 800)
    const dialog = app.getByRole('dialog')
    await dialog.waitFor()
    await pause(1500)
    mark('details')
    await choose(dialog.locator('select').first(), { index: 1 })
    await type(dialog.locator('textarea'), 'Signed lease contract', { wait: 1500 })
    await shot('upload')
    mark('cancel')
    await click(dialog.getByRole('button', { name: 'Cancel' }), 1200)
  },
}
