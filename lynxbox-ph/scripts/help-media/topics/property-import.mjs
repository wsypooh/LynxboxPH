export default {
  startPath: '/dashboard/properties/manage',
  async steps({ app, ready, mark, click, hover, shot, pause }) {
    await ready(app.getByRole('button', { name: 'Import CSV' }))
    mark('import')
    await click(app.getByRole('button', { name: 'Import CSV' }), 800)
    const dialog = app.getByRole('dialog')
    await dialog.waitFor()
    await pause(2000)
    await shot('import')
    mark('template')
    await hover(dialog.getByRole('button', { name: 'Download Template CSV' }))
    await pause(2500)
    mark('files')
    await hover(dialog.locator('input[type="file"]').first().locator('xpath=..'))
    await pause(2500)
    mark('cancel')
    await click(dialog.getByRole('button', { name: 'Cancel' }), 1200)
  },
}
