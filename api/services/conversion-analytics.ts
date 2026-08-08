import type { AuditLead } from "./audit-types"

type AnalyticsEnvironment = Record<string, string | undefined>

export async function emitAuditAnalytics(
  event: "audit_request_successful" | "audit_request_failed",
  lead: AuditLead,
  env: AnalyticsEnvironment = process.env,
) {
  const url = env.AUDIT_ANALYTICS_WEBHOOK_URL
  if (!url) return

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(env.AUDIT_ANALYTICS_WEBHOOK_SECRET ? { Authorization: `Bearer ${env.AUDIT_ANALYTICS_WEBHOOK_SECRET}` } : {}),
      },
      body: JSON.stringify({ event, leadId: lead.id, source: lead.source, occurredAt: new Date().toISOString() }),
      signal: AbortSignal.timeout(3_000),
    })
    if (!response.ok) console.error("audit analytics delivery failed", { event, leadId: lead.id, status: response.status })
  } catch (error) {
    console.error("audit analytics delivery failed", { event, leadId: lead.id, error })
  }
}
