export default {
  startPath: '/dashboard/invoices',
  async steps({ app, page, ready, mark, click, type, hover, shot, pause }) {
    await ready(app.locator('tbody tr').first())
    mark('select')
    const boxes = app.locator('tbody tr input[type="checkbox"]')
    await click(boxes.nth(0).locator('xpath=..'), 600)
    await click(boxes.nth(1).locator('xpath=..'), 1200)
    mark('bulk')
    await click(app.getByRole('button', { name: 'Bulk Actions' }), 1200)
    await shot('bulk-menu')
    mark('readings')
    await click(app.getByRole('menuitem', { name: /Enter Meter Readings/ }), 800)
    const dialog = app.getByRole('dialog')
    await dialog.waitFor()
    await pause(2000)
    mark('enter')
    const inputs = dialog.locator('tbody tr input')
    const readings = ['1250', '2310']
    for (let i = 0; i < Math.min(readings.length, await inputs.count()); i++) {
      await type(inputs.nth(i), readings[i], { replace: true })
    }
    await pause(1500)
    await shot('readings')
    mark('cancel')
    await click(dialog.getByRole('button', { name: 'Cancel' }), 1200)
  },
}
