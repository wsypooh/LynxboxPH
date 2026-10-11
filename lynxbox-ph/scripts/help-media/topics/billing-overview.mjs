// Deliberately never scrolls to or captures the "Send payment to" box: it shows the platform's
// real receiving account number and QR code, which must not end up in public help images.
export default {
  startPath: '/dashboard/billing',
  async steps({ app, ready, mark, hover, scrollTop, shot, pause }) {
    await ready(app.getByRole('heading', { name: 'Submit a Payment' }))
    mark('status')
    await hover(app.getByRole('heading', { name: 'Billing' }).first())
    await pause(2500)
    await shot('status')
    mark('pay')
    await hover(app.getByRole('heading', { name: 'Submit a Payment' }))
    await pause(3000)
    mark('plans')
    await scrollTop(app.getByRole('heading', { name: 'Compare Plans' }), 1500)
    await hover(app.getByRole('heading', { name: 'Compare Plans' }))
    await pause(2500)
    mark('history')
    await hover(app.getByRole('heading', { name: 'Payment History' }))
    await pause(2500)
  },
}
