export default {
  startPath: '/dashboard',
  async steps({ app, ready, mark, hover, shot, pause }) {
    // Business plan usage cards must read "Unlimited". If this times out, the deployed frontend
    // predates the billingService.getUsage() null -> Infinity fix and would show "of null allowed".
    const quick = app.getByRole('heading', { name: 'Quick Actions' })
    await app.getByText('Unlimited').first().waitFor({ timeout: 45000 })
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
