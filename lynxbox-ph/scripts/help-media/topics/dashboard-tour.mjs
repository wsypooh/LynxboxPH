export default {
  startPath: '/dashboard',
  async steps({ app, ready, mark, hover, shot, pause }) {
    // (steps run once; the hide below must happen after the usage cards have rendered)
    // Sandbox still runs the old frontend, where Business-plan usage cards render "of null allowed"
    // (fixed in billingService.getUsage; harmless once deployed). Hide those lines until then.
    const quick = app.getByRole('heading', { name: 'Quick Actions' })
    await quick.waitFor({ timeout: 45000 })
    await app.getByText(/allowed/).first().waitFor({ timeout: 45000 })
    await pause(1500)
    await app.getByText(/allowed/).evaluateAll(els => els.forEach(e => { e.style.visibility = 'hidden' }))
    await ready(quick)
    await shot('dashboard')
    const link = name => app.getByRole('link', { name, exact: true }).first()
    mark('properties')
    await hover(link('Property Listings'))
    await pause(2200)
    mark('buildings')
    await hover(link('Buildings'))
    await pause(2200)
    mark('tenants')
    await hover(link('Tenants'))
    await pause(2200)
    mark('invoices')
    await hover(link('Invoices'))
    await pause(2200)
    mark('billing')
    await hover(link('Billing'))
    await pause(2200)
  },
}
