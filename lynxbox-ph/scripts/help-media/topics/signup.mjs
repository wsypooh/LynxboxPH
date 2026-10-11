// Public page: no login. Fills the form with fake details and never submits.
export default {
  startPath: '/auth/signup',
  auth: false,
  async steps({ app, ready, mark, type, hover, shot, pause }) {
    await ready(app.getByPlaceholder('John Doe'))
    mark('name')
    await type(app.getByPlaceholder('John Doe'), 'Juan Dela Cruz')
    await type(app.getByPlaceholder('your@email.com'), 'juan@example.com', { wait: 800 })
    mark('password')
    const passwords = app.getByPlaceholder('••••••••')
    await type(passwords.nth(0), 'SamplePass#2026', { wait: 600 })
    await type(passwords.nth(1), 'SamplePass#2026', { wait: 1200 })
    await shot('form')
    mark('create')
    await hover(app.getByRole('button', { name: 'Create Account' }))
    await pause(2500)
  },
}
