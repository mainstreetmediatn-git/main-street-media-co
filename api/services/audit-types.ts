export type AuditLead = {
  id: string
  receivedAt: string
  name: string
  businessName: string
  phone: string | null
  email: string | null
  website: string | null
  industry: string
  biggestProblem: string
  source: "website"
  status: "new"
}

export type AuditRequestBody = {
  requestId?: unknown
  name?: unknown
  contactName?: unknown
  businessName?: unknown
  phone?: unknown
  email?: unknown
  website?: unknown
  industry?: unknown
  category?: unknown
  biggestProblem?: unknown
  bottleneck?: unknown
  companyWebsite?: unknown
}

export function cleanText(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : ""
}

export function validateAuditRequest(body: AuditRequestBody) {
  const normalized = {
    requestId: cleanText(body.requestId, 120),
    name: cleanText(body.name ?? body.contactName, 160),
    businessName: cleanText(body.businessName, 160),
    phone: cleanText(body.phone, 50),
    email: cleanText(body.email, 320).toLowerCase(),
    website: cleanText(body.website, 500),
    industry: cleanText(body.industry ?? body.category, 160),
    biggestProblem: cleanText(body.biggestProblem ?? body.bottleneck, 2000),
    companyWebsite: cleanText(body.companyWebsite, 100),
  }
  const errors: string[] = []
  if (!normalized.name) errors.push("name is required")
  if (!normalized.businessName) errors.push("businessName is required")
  if (!normalized.industry) errors.push("industry is required")
  if (!normalized.biggestProblem) errors.push("biggestProblem is required")
  if (!normalized.email && !normalized.phone) errors.push("either email or phone is required")
  if (normalized.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)) errors.push("email is invalid")
  return { normalized, errors }
}
