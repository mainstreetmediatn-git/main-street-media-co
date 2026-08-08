import { randomUUID } from "node:crypto"
import { Resend } from "resend"
import { emitAuditAnalytics } from "./services/conversion-analytics"
import { createLeadStore, type LeadStore } from "./services/lead-store"
import { type AuditLead, type AuditRequestBody, validateAuditRequest } from "./services/audit-types"

type VercelRequest = { method?: string; body?: unknown }
type VercelResponse = {
  status: (code: number) => VercelResponse
  setHeader: (name: string, value: string) => void
  json: (body: unknown) => void
}

type HandlerDependencies = {
  env: Record<string, string | undefined>
  leadStore: LeadStore
  sendNotification: (lead: AuditLead) => Promise<void>
  emitAnalytics: (event: "audit_request_successful" | "audit_request_failed", lead: AuditLead) => Promise<void>
  now: () => Date
  id: () => string
}

function defaultDependencies(): HandlerDependencies {
  const env = process.env
  return {
    env,
    leadStore: createLeadStore(env),
    async sendNotification(lead) {
      const apiKey = env.RESEND_API_KEY
      const toEmail = env.AUDIT_TO_EMAIL || "mainstreetmediatn@gmail.com"
      const fromEmail = env.AUDIT_FROM_EMAIL
      if (!apiKey || !toEmail || !fromEmail) throw new Error("Resend delivery is not configured")
      const resend = new Resend(apiKey)
      const { error } = await resend.emails.send({
        from: fromEmail,
        to: [toEmail],
        subject: `Free Visibility Audit Request: ${lead.businessName}`,
        replyTo: lead.email || undefined,
        text: [
          "New Free Visibility Audit request",
          "",
          `Lead ID: ${lead.id}`,
          `Name: ${lead.name}`,
          `Business Name: ${lead.businessName}`,
          `Phone: ${lead.phone || "Not provided"}`,
          `Email: ${lead.email || "Not provided"}`,
          `Website: ${lead.website || "Not provided"}`,
          `Industry: ${lead.industry}`,
          "",
          "Biggest Problem:",
          lead.biggestProblem,
        ].join("\n"),
      })
      if (error) throw new Error(`Resend delivery failed: ${error.message}`)
    },
    emitAnalytics: (event, lead) => emitAuditAnalytics(event, lead, env),
    now: () => new Date(),
    id: () => randomUUID(),
  }
}

export function createAuditRequestHandler(overrides: Partial<HandlerDependencies> = {}) {
  const dependencies = { ...defaultDependencies(), ...overrides }

  async function emitAnalyticsSafely(event: "audit_request_successful" | "audit_request_failed", lead: AuditLead) {
    try {
      await dependencies.emitAnalytics(event, lead)
    } catch (error) {
      console.error("audit analytics emission failed", { event, leadId: lead.id, error })
    }
  }

  return async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader("Cache-Control", "no-store")
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST")
      return res.status(405).json({ error: "Method not allowed" })
    }

    const body = (req.body ?? {}) as AuditRequestBody
    const { normalized, errors } = validateAuditRequest(body)
    if (normalized.companyWebsite) return res.status(200).json({ ok: true })
    if (errors.length) return res.status(400).json({ error: "Invalid audit request", errors })

    const lead: AuditLead = {
      id: normalized.requestId || dependencies.id(),
      receivedAt: dependencies.now().toISOString(),
      name: normalized.name,
      businessName: normalized.businessName,
      phone: normalized.phone || null,
      email: normalized.email || null,
      website: normalized.website || null,
      industry: normalized.industry,
      biggestProblem: normalized.biggestProblem,
      source: "website",
      status: "new",
    }

    let referenceId: string
    try {
      ;({ referenceId } = await dependencies.leadStore.persist(lead))
    } catch (error) {
      console.error("audit lead persistence failed", { leadId: lead.id, error })
      await emitAnalyticsSafely("audit_request_failed", lead)
      return res.status(503).json({ error: "Audit request storage is temporarily unavailable", requestId: lead.id })
    }

    try {
      await dependencies.sendNotification(lead)
    } catch (error) {
      console.error("audit Resend notification failed", { leadId: lead.id, referenceId, error })
      await emitAnalyticsSafely("audit_request_failed", lead)
      return res.status(502).json({
        error: "Your request was saved, but inbox notification failed",
        saved: true,
        requestId: lead.id,
        referenceId,
      })
    }

    await emitAnalyticsSafely("audit_request_successful", lead)
    return res.status(201).json({ ok: true, requestId: lead.id, referenceId })
  }
}

export default createAuditRequestHandler()
