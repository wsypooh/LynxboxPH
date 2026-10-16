// GA4 conversion tracking with first-touch UTM attribution.
//
// GA4 attributes a session to its UTMs on its own, but a signup spans several page loads
// and the email-confirm step can happen hours later, after the session (and its campaign)
// has expired. So the first-touch UTMs are kept in localStorage and attached to every
// conversion event, which keeps the original social post attributable to the final signup.
//
// gtag only exists on lynxbox.ph (see RootShell.tsx), so everything here is a no-op on
// sandbox/localhost.

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const
const STORAGE_KEY = 'lynxbox_first_touch'
const TTL_MS = 30 * 24 * 60 * 60 * 1000

type Attribution = Partial<Record<(typeof UTM_KEYS)[number], string>> & {
  referrer?: string
  landing_path?: string
  captured_at: number
}

function readStored(): Attribution | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Attribution
    return Date.now() - parsed.captured_at < TTL_MS ? parsed : null
  } catch {
    return null
  }
}

// Call once per page load. First touch wins: only stores when nothing valid is stored yet.
// A visit with no UTMs is stored too (as direct/referral), so a later UTM link doesn't
// overwrite how the visitor actually first found the site.
export function captureAttribution(): void {
  if (typeof window === 'undefined' || readStored()) return
  try {
    const params = new URLSearchParams(window.location.search)
    const attribution: Attribution = { captured_at: Date.now() }
    for (const key of UTM_KEYS) {
      const value = params.get(key)
      if (value) attribution[key] = value.slice(0, 100)
    }
    if (document.referrer) {
      try {
        const referrerHost = new URL(document.referrer).hostname
        if (referrerHost !== window.location.hostname) attribution.referrer = referrerHost
      } catch {}
    }
    attribution.landing_path = window.location.pathname
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(attribution))
  } catch {}
}

export function trackEvent(name: string, params: Record<string, string | number | boolean | undefined> = {}): void {
  if (typeof window === 'undefined') return
  const gtag = (window as any).gtag as ((...args: unknown[]) => void) | undefined
  if (!gtag) return

  const { captured_at: _ignored, ...firstTouch } = readStored() ?? { captured_at: 0 }
  const payload: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(firstTouch)) payload[`first_touch_${key}`] = value
  for (const [key, value] of Object.entries(params)) if (value !== undefined) payload[key] = value
  gtag('event', name, payload)
}
