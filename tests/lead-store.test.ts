import { afterEach, describe, expect, it, vi } from "vitest"
import { createLeadStore } from "../api/services/lead-store"
import type { AuditLead } from "../api/services/audit-types"

const lead: AuditLead = {
  id: "audit-123",
  receivedAt: "2026-08-08T12:00:00.000Z",
  name: "Test Operator",
  businessName: "Test Plumbing",
  phone: null,
  email: "operator@example.com",
  website: "https://example.com",
  industry: "Plumbing",
  biggestProblem: "Qualified calls are inconsistent.",
  source: "website",
  status: "new",
}

afterEach(() => vi.unstubAllGlobals())

describe("durable lead store", () => {
  it("fails explicitly when production storage is not configured", async () => {
    await expect(createLeadStore({}).persist(lead)).rejects.toThrow("not configured")
  })

  it("sends an idempotent audit envelope and returns the durable reference", async () => {
    const fetchMock = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) =>
      new Response(JSON.stringify({ referenceId: "drive-123" }), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)
    const store = createLeadStore({
      AUDIT_LEAD_STORE_URL: "https://example.com/audit-store",
      AUDIT_LEAD_STORE_SECRET: "test-secret",
    })

    await expect(store.persist(lead)).resolves.toEqual({ referenceId: "drive-123" })
    const [, request] = fetchMock.mock.calls[0]
    expect(request?.headers).toMatchObject({
      Authorization: "Bearer test-secret",
      "Idempotency-Key": "audit-123",
    })
    expect(JSON.parse(String(request?.body))).toEqual({ type: "audit_request", secret: "test-secret", lead })
  })

  it("surfaces upstream storage failures", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("unavailable", { status: 503 })))
    await expect(createLeadStore({ AUDIT_LEAD_STORE_URL: "https://example.com/audit-store" }).persist(lead)).rejects.toThrow("HTTP 503")
  })
})
