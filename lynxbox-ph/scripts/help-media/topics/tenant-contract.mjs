// Lease contracts are attached per contract in Edit Tenant ("Attach lease PDF"), not via the
// generic Upload Document button (which no longer offers the Lease Contract category).
export default {
  startPath: '/dashboard/tenants',
  async steps({ app, ready, mark, click, type, hover, scrollTop, shot, pause }) {
    await ready(app.getByRole('table').first())
    mark('edit')
    await click(app.getByRole('button', { name: 'Edit tenant' }).first(), 800)
    const editDialog = app.getByRole('dialog').first()
    await editDialog.waitFor()
    await pause(1500)
    mark('contracts')
    await scrollTop(editDialog.getByRole('heading', { name: 'Contracts' }), 1500)
    const attach = editDialog.getByRole('button', { name: 'Attach lease PDF' }).first()
    await attach.waitFor({ timeout: 20000 })
    await hover(attach)
    await pause(1500)
    await shot('contract')
    mark('attach')
    await click(attach, 800)
    const uploadDialog = app.getByRole('dialog').last()
    await uploadDialog.getByRole('button', { name: 'Upload' }).waitFor()
    await pause(2000)
    mark('details')
    await type(uploadDialog.locator('textarea'), 'Signed lease, Jan 2026 to Jan 2027', { wait: 1500 })
    await shot('attach')
    mark('cancel')
    await click(uploadDialog.getByRole('button', { name: 'Cancel' }), 1000)
    await click(editDialog.getByRole('button', { name: 'Cancel' }), 1200)
  },
}
