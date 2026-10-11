export default {
  startPath: '/dashboard/team',
  async steps({ app, ready, mark, click, type, choose, shot, pause }) {
    // The member list shows the demo account's own email; blur it in all help media.
    const memberEmails = app.locator('tbody td:first-child')
    await memberEmails.first().waitFor({ timeout: 45000 })
    await memberEmails.evaluateAll(els => els.forEach(e => { e.style.filter = 'blur(6px)' }))
    await ready(app.getByRole('button', { name: 'Invite Member' }))
    mark('invite')
    await click(app.getByRole('button', { name: 'Invite Member' }), 800)
    const dialog = app.getByRole('dialog')
    await dialog.waitFor()
    await pause(1500)
    mark('email')
    await type(dialog.getByPlaceholder('colleague@example.com'), 'colleague@example.com', { wait: 1500 })
    mark('role')
    await choose(dialog.locator('select').first(), { index: 1 }, 2000)
    await shot('invite')
    mark('cancel')
    await click(dialog.getByRole('button', { name: 'Cancel' }), 1200)
  },
}
