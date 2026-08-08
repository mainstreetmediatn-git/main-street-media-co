import { describe, expect, it, vi } from "vitest"
import { createAuditRequestHandler } from "../api/audit-request"
import type { AuditLead } from "../api/services/audit-types"

function responseRecorder() {
  let statusCode = 200
  let body: unknown
  const response = {
    status(code: number) {
      statusCode = code
      return response
    },
    setHeader: vi.fn(),
    json(value: unknown) {
      body = value
    },
  }
  return { response, result: () => ({ statusCode, body }) }
}

const validBody = {
  requestId: "audit-test-1",
  name: "Test Operator",
  businessName: "Test Plumbing",
  email: "operator@example.com",
  phone: "555-0100",
  website: "https://example.com",
  industry: "Plumbing",
  biggestProblem: "Qualified calls are inconsistent.",
}

function dependencies(overrides: Parameters<typeof createAuditRequestHandler>[0] = {}) {
  return {
    env: {},
    leadStore: { persist: vi.fn(async (lead: AuditLead) => ({ referenceId: lead.id })) },
    sendNotification: vi.fn(async () => undefined),
    emitAnalytics: vi.fn(async () => undefined),
    now: () => new Date("2026-08-08T12:00:00.000Z"),
    id: () => "generated-id",
    ...overrides,
  }
}

describe("POST /api/audit-request", () => {
  it("validates before persistence", async () => {
    const deps = dependencies()
    const recorder = responseRecorder()
    await createAuditRequestHandler(deps)({ method: "POST", body: {} }, recorder.response)
    expect(recorder.result().statusCode).toBe(400)
    expect(deps.leadStore.persist).not.toHaveBeenCalled()
    expect(deps.sendNotification).not.toHaveBeenCalled()
  })

  it("persists before notifying and then emits success analytics", async () => {
    const order: string[] = []
    const deps = dependencies({
      leadStore: { persist: vi.fn(async () => { order.push("persist"); return { referenceId: "crm-1" } }) },
      sendNotification: vi.fn(async () => { order.push("notify") }),
      emitAnalytics: vi.fn(async () => { order.push("analytics") }),
    })
    const recorder = responseRecorder()
    await createAuditRequestHandler(deps)({ method: "POST", body: validBody }, recorder.response)
    expect(order).toEqual(["persist", "notify", "analytics"])
    expect(recorder.result()).toEqual({
      statusCode: 201,
      body: { ok: true, requestId: "audit-test-1", referenceId: "crm-1" },
    })
  })

  it("does not notify when durable persistence fails", async () => {
    const deps = dependencies({ leadStore: { persist: vi.fn(async () => { throw new Error("store down") }) } })
    const recorder = responseRecorder()
    await createAuditRequestHandler(deps)({ method: "POST", body: validBody }, recorder.response)
    expect(recorder.result().statusCode).toBe(503)
    expect(deps.sendNotification).not.toHaveBeenCalled()
    expect(deps.emitAnalytics).toHaveBeenCalledWith("audit_request_failed", expect.objectContaining({ id: "audit-test-1" }))
  })

  it("reports saved=true when Resend fails after persistence", async () => {
    const deps = dependencies({ sendNotification: vi.fn(async () => { throw new Error("resend down") }) })
    const recorder = responseRecorder()
    await createAuditRequestHandler(deps)({ method: "POST", body: validBody }, recorder.response)
    expect(recorder.result()).toEqual({
      statusCode: 502,
      body: expect.objectContaining({ saved: true, requestId: "audit-test-1" }),
    })
  })

  it("does not lose a successful lead when optional analytics fails", async () => {
    const deps = dependencies({ emitAnalytics: vi.fn(async () => { throw new Error("analytics down") }) })
    const recorder = responseRecorder()
    await createAuditRequestHandler(deps)({ method: "POST", body: validBody }, recorder.response)
    expect(recorder.result().statusCode).toBe(201)
  })
})
