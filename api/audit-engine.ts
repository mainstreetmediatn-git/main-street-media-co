import { generateAuditBundle, persistAuditBundle } from "./services/audit-engine"

type VercelRequest = {
    method?: string
    body?: unknown
}

type VercelResponse = {
    status: (code: number) => VercelResponse
    setHeader: (name: string, value: string) => void
    json: (body: unknown) => void
}

type AuditEngineBody = {
    crawledBusiness?: unknown
    crawl?: unknown
    saveToDisk?: unknown
    outputDir?: unknown
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

function text(value: unknown) {
    return typeof value === "string" ? value.trim() : ""
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST")
        return res.status(405).json({ error: "Method not allowed" })
    }

    let body: AuditEngineBody = {}
    try {
        body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {}) as AuditEngineBody
    } catch {
        return res.status(400).json({ error: "Body must be valid JSON" })
    }

    const crawledBusiness = body.crawledBusiness ?? body.crawl
    if (!isObject(crawledBusiness)) {
        return res.status(400).json({ error: "crawledBusiness is required" })
    }

    const bundle = generateAuditBundle(crawledBusiness as Parameters<typeof generateAuditBundle>[0])
    const requestedOutputDir = text(body.outputDir)
    const outputDir = requestedOutputDir || process.env.AUDIT_OUTPUT_DIR || ""

    let persisted = null
    if (Boolean(body.saveToDisk) && outputDir) {
        persisted = await persistAuditBundle(bundle, outputDir)
    }

    res.setHeader("Cache-Control", "no-store")
    return res.status(200).json({
        ok: true,
        persisted: Boolean(persisted),
        outputDir: (persisted?.outputDir ?? outputDir) || null,
        bundle,
        saveTargets: bundle.savePlan,
        persistedFiles: persisted?.writtenFiles ?? [],
    })
}
