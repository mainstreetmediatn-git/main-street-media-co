export type ConversionEvent =
  | "audit_request_started"
  | "audit_request_submitted"
  | "audit_request_successful"
  | "audit_request_failed"
  | "booking_cta_clicked"
  | "booking_15_minute_clicked"
  | "booking_30_minute_clicked"
  | "phone_cta_clicked"
  | "email_cta_clicked"

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

export function trackConversion(event: ConversionEvent, properties: Record<string, unknown> = {}) {
  const payload = { event, ...properties }
  window.dataLayer = window.dataLayer ?? []
  window.dataLayer.push(payload)
  window.dispatchEvent(new CustomEvent("msm:analytics", { detail: payload }))
  window.gtag?.("event", event, properties)
}

export function bookingEvents(url: URL): ConversionEvent[] {
  if (url.hostname !== "cal.com") return []
  const events: ConversionEvent[] = ["booking_cta_clicked"]
  if (url.pathname.endsWith("/15min")) events.push("booking_15_minute_clicked")
  if (url.pathname.endsWith("/30min")) events.push("booking_30_minute_clicked")
  return events
}

export function initializeAnalytics(root: Document = document) {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim()
  if (measurementId && !root.querySelector('script[data-msm-analytics="google"]')) {
    window.dataLayer = window.dataLayer ?? []
    window.gtag = (...args: unknown[]) => window.dataLayer?.push(args)
    window.gtag("js", new Date())
    window.gtag("config", measurementId, { send_page_view: true })
    const script = root.createElement("script")
    script.async = true
    script.dataset.msmAnalytics = "google"
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`
    root.head.append(script)
  }

  root.addEventListener("click", (event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const link = target.closest<HTMLAnchorElement>("a[href]")
    if (!link) return

    const href = link.getAttribute("href") ?? ""
    if (href.startsWith("tel:")) trackConversion("phone_cta_clicked", { href })
    if (href.startsWith("mailto:")) trackConversion("email_cta_clicked", { href })

    try {
      const url = new URL(link.href, window.location.href)
      for (const bookingEvent of bookingEvents(url)) {
        trackConversion(bookingEvent, { href: url.toString() })
      }
    } catch {
      // Ignore malformed third-party links; navigation should remain unaffected.
    }
  })
}
