import type { AuditLead } from "./audit-types"

export type LeadStore = {
  persist(lead: AuditLead): Promise<{ referenceId: string }>
}

type LeadStoreEnvironment = Record<string, string | undefined>

function configuredUrl(env: LeadStoreEnvironment) {
  return env.AUDIT_LEAD_STORE_URL || env.CRM_WEBHOOK_URL || ""
}

export function createLeadStore(env: LeadStoreEnvironment = process.env): LeadStore {
  const url = configuredUrl(env)
  if (!url) {
    return {
      async persist() {
        throw new Error("Durable lead storage is not configured")
      },
    }
  }

  return {
    async persist(lead) {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(env.AUDIT_LEAD_STORE_SECRET ? { Authorization: `Bearer ${env.AUDIT_LEAD_STORE_SECRET}` } : {}),
          ...(env.CRM_API_KEY ? { "X-CRM-API-Key": env.CRM_API_KEY } : {}),
          "Idempotency-Key": lead.id,
        },
        body: JSON.stringify({ type: "audit_request", secret: env.AUDIT_LEAD_STORE_SECRET, lead }),
        signal: AbortSignal.timeout(8_000),
      })

      if (!response.ok) throw new Error(`Durable lead storage returned HTTP ${response.status}`)
      const result = (await response.json().catch(() => ({}))) as { referenceId?: string; id?: string }
      return { referenceId: result.referenceId || result.id || lead.id }
    },
  }
}
