type AuditPayload = {
  name?: string
  businessName?: string
  phone?: string
  email?: string
  website?: string
  industry?: string
  biggestProblem?: string
  companyWebsite?: string
}

type VercelRequest = {
  method?: string
  body?: AuditPayload | string
}

type VercelResponse = {
  status: (code: number) => VercelResponse
  setHeader: (name: string, value: string) => void
  json: (body: unknown) => void
  end: () => void
}

const EDGE_FUNCTION_URL =
  "https://wdxalrvkrmeewnqiqxqk.supabase.co/functions/v1/audit-request"

const PRODUCTION_ORIGIN = "https://main-street-media-co.vercel.app"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store")
  res.setHeader("Allow", "POST, OPTIONS")

  if (req.method === "OPTIONS") {
    res.status(204).end()
    return
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" })
    return
  }

  let body: AuditPayload
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body ?? {})
  } catch {
    res.status(400).json({ error: "Invalid JSON body" })
    return
  }

  try {
    const upstream = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: PRODUCTION_ORIGIN,
      },
      body: JSON.stringify({
        contact_name: body.name,
        business_name: body.businessName,
        phone: body.phone,
        email: body.email,
        website: body.website,
        business_category: body.industry,
        notes: body.biggestProblem,
        company_website_confirm: body.companyWebsite,
      }),
    })

    const result = await upstream.json().catch(() => ({
      error: "Invalid response from audit service",
    }))

    res.status(upstream.status).json(result)
  } catch (error) {
    console.error("audit-request proxy failed", error)
    res.status(502).json({ error: "Audit service is temporarily unavailable" })
  }
}
