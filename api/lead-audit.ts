declare const process: {
  env: Record<string, string | undefined>
}

type IntegrationMode = "LIVE" | "SANDBOX" | "MOCK" | "DISABLED" | "NOT_CONFIGURED"

type VercelRequest = {
  method?: string
  body?: unknown
}

type VercelResponse = {
  status: (code: number) => VercelResponse
  setHeader: (name: string, value: string) => void
  json: (body: unknown) => void
}

type LeadAuditBody = {
  businessName?: unknown
  category?: unknown
  website?: unknown
  googleMaps?: unknown
  location?: unknown
  contactName?: unknown
  email?: unknown
  phone?: unknown
  bottleneck?: unknown
  companyWebsite?: unknown
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function parseBody(body: unknown): LeadAuditBody {
  if (typeof body === "string") return JSON.parse(body) as LeadAuditBody
  return (body ?? {}) as LeadAuditBody
}

function requiredFieldErrors(body: LeadAuditBody) {
  const errors: string[] = []
  if (!text(body.businessName)) errors.push("businessName is required")
  if (!text(body.category)) errors.push("category is required")
  if (!text(body.contactName)) errors.push("contactName is required")
  if (!text(body.bottleneck)) errors.push("bottleneck is required")
  if (!text(body.email) && !text(body.phone)) errors.push("email or phone is required")
  return errors
}

function resolveMode(): IntegrationMode {
  if (process.env.LEAD_AUDIT_DISABLED === "true") return "DISABLED"
  if (process.env.CRM_WEBHOOK_URL) return "LIVE"
  if (process.env.LEAD_AUDIT_SANDBOX === "true" || process.env.NODE_ENV !== "production") return "SANDBOX"
  return "NOT_CONFIGURED"
}

async function postWebhook(body: LeadAuditBody, referenceId: string) {
  const webhookUrl = process.env.CRM_WEBHOOK_URL
  if (!webhookUrl) return

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.CRM_API_KEY ? { Authorization: `Bearer ${process.env.CRM_API_KEY}` } : {}),
    },
    body: JSON.stringify({ type: "lead.audit.requested", referenceId, body }),
  })

  if (!response.ok) {
    throw new Error(`CRM webhook failed with ${response.status}`)
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    return res.status(405).json({ error: "Method not allowed" })
  }

  let body: LeadAuditBody
  try {
    body = parseBody(req.body)
  } catch {
    return res.status(400).json({ ok: false, mode: "DISABLED", message: "Body must be valid JSON" })
  }

  if (text(body.companyWebsite)) {
    return res.status(200).json({ ok: true, mode: "MOCK", message: "Spam trap accepted without dispatch." })
  }

  const errors = requiredFieldErrors(body)
  if (errors.length > 0) {
    return res.status(400).json({ ok: false, mode: "DISABLED", message: "Audit request is missing required fields.", errors })
  }

  const mode = resolveMode()
  const referenceId = `MSM-${Date.now().toString(36).toUpperCase()}`

  if (mode === "DISABLED") {
    return res.status(503).json({ ok: false, mode, message: "Lead audit intake is disabled.", referenceId })
  }

  if (mode === "LIVE") {
    try {
      await postWebhook(body, referenceId)
      return res.status(200).json({ ok: true, mode, message: "Audit request dispatched to the live CRM adapter.", referenceId })
    } catch {
      console.error("lead-audit fallback", { referenceId, body })
      return res.status(202).json({
        ok: true,
        mode: "SANDBOX",
        message: "CRM dispatch failed; request was accepted into server fallback logs for manual recovery.",
        referenceId,
      })
    }
  }

  console.info("lead-audit sandbox", { referenceId, body })
  return res.status(202).json({
    ok: true,
    mode,
    message: mode === "SANDBOX" ? "Audit request accepted in sandbox storage/log mode." : "Audit request accepted, but no live CRM adapter is configured.",
    referenceId,
  })
}
