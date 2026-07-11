import { lookup } from "dns/promises"
import net from "net"
import { Resend } from "resend"

declare const process: {
    env: Record<string, string | undefined>
}

type VercelRequest = {
    method?: string
    body?: unknown
}

type VercelResponse = {
    status: (code: number) => VercelResponse
    setHeader: (name: string, value: string) => void
    json: (body: unknown) => void
}

type LeadCrawlBody = {
    url?: unknown
    maxPages?: unknown
}

type CrawledPage = {
    url: string
    title: string
    description: string
    hasForm: boolean
    hasPhone: boolean
    hasEmail: boolean
    ctaCount: number
    trustCount: number
    schemaCount: number
}

type CrawlResponse = {
    inputUrl: string
    score: number
    grade: string
    summary: string
    pagesCrawled: number
    internalLinks: number
    signals: string[]
    opportunities: string[]
    pages: CrawledPage[]
}

type PackageDraft = {
    title: string
    summary: string
    priorityFindings: string[]
    recommendedActions: string[]
    folderName: string
}

type PhaseTwoAutomation = {
    trigger: string
    workflow: string
    recommendedTools: string[]
    crmUpdate: string[]
    saveTargets: string[]
}

type DeliveryStatus = "sent" | "partial" | "failed" | "not_configured"

type DeliveryResult = {
    status: DeliveryStatus
    configuredTargets: string[]
    deliveredTargets: string[]
    failedTargets: string[]
}

type PhaseTwoResponse = CrawlResponse & {
    phase: "discovery"
    leadPriority: "high" | "medium" | "low"
    packageDrafts: {
        visibilityAudit: PackageDraft
        whatIfPackage: PackageDraft
    }
    automation: PhaseTwoAutomation
    delivery: DeliveryResult
}

const FETCH_TIMEOUT_MS = 10_000
const MAX_REDIRECTS = 5

function text(value: unknown) {
    return typeof value === "string" ? value.trim() : ""
}

function toInt(value: unknown, fallback: number) {
    const parsed = typeof value === "number" ? value : Number.parseInt(text(value), 10)
    return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeHost(hostname: string) {
    return hostname.toLowerCase().replace(/^www\./, "")
}

function isPrivateIPv4(address: string) {
    const parts = address.split(".").map((part) => Number.parseInt(part, 10))
    if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return true
    const [a, b] = parts
    return (
        a === 10 ||
        a === 127 ||
        a === 0 ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168)
    )
}

function isPrivateIPv6(address: string) {
    const lower = address.toLowerCase()
    return (
        lower === "::1" ||
        lower.startsWith("fe80:") ||
        lower.startsWith("fc") ||
        lower.startsWith("fd")
    )
}

async function isPublicHostname(hostname: string) {
    if (!hostname || hostname === "localhost" || hostname.endsWith(".local")) return false

    const numericType = net.isIP(hostname)
    if (numericType === 4) return !isPrivateIPv4(hostname)
    if (numericType === 6) return !isPrivateIPv6(hostname)

    const records = await lookup(hostname, { all: true, verbatim: true }).catch(() => [])
    if (!records.length) return false

    return records.some((record) => {
        if (record.family === 4 || net.isIP(record.address) === 4) {
            return !isPrivateIPv4(record.address)
        }
        if (record.family === 6 || net.isIP(record.address) === 6) {
            return !isPrivateIPv6(record.address)
        }
        return false
    })
}

function normalizeUrl(url: URL) {
    const normalized = new URL(url.toString())
    normalized.hash = ""
    normalized.search = ""
    if (normalized.pathname.length > 1 && normalized.pathname.endsWith("/")) {
        normalized.pathname = normalized.pathname.slice(0, -1)
    }
    return normalized.toString()
}

function stripHtml(html: string) {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<!--[\s\S]*?-->/g, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
}

function countMatches(value: string, pattern: RegExp) {
    return value.match(pattern)?.length ?? 0
}

function countPages(pages: CrawledPage[], predicate: (page: CrawledPage) => boolean) {
    return pages.filter(predicate).length
}

function parsePage(url: URL, html: string): { page: CrawledPage; links: string[] } {
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() ?? ""
    const description =
        html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i)?.[1]?.trim() ?? ""
    const bodyText = stripHtml(html)

    const links = new Set<string>()
    const linkPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi
    for (const match of html.matchAll(linkPattern)) {
        const rawHref = match[1]?.trim()
        if (!rawHref || rawHref.startsWith("#")) continue
        if (/^(mailto:|tel:|javascript:)/i.test(rawHref)) continue

        try {
            const parsed = new URL(rawHref, url)
            if (!["http:", "https:"].includes(parsed.protocol)) continue
            links.add(normalizeUrl(parsed))
        } catch {
            continue
        }
    }

    const page: CrawledPage = {
        url: normalizeUrl(url),
        title,
        description,
        hasForm: /<form\b/i.test(html),
        hasPhone: /(?:\+?\d[\d\s().-]{7,}\d)/.test(bodyText) || /call\s+us/i.test(bodyText),
        hasEmail: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(bodyText),
        ctaCount: countMatches(bodyText, /\b(call|book|quote|estimate|audit|consult|contact|schedule|request|get started)\b/gi),
        trustCount: countMatches(bodyText, /\b(review|testimonial|case study|results|licensed|insured|certified|award|proof|portfolio)\b/gi),
        schemaCount: countMatches(html, /application\/ld\+json/gi),
    }

    return { page, links: Array.from(links) }
}

async function fetchHtml(url: URL, userAgent: string, rootHost: string) {
    let currentUrl = new URL(url.toString())

    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

        let response: Response
        try {
            response = await fetch(currentUrl, {
                headers: {
                    "user-agent": userAgent,
                    accept: "text/html,application/xhtml+xml",
                },
                redirect: "manual",
                signal: controller.signal,
            })
        } catch {
            clearTimeout(timeout)
            return null
        } finally {
            clearTimeout(timeout)
        }

        if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get("location")
            if (!location) return null

            try {
                const nextUrl = new URL(location, currentUrl)
                if (!["http:", "https:"].includes(nextUrl.protocol)) return null
                if (normalizeHost(nextUrl.hostname) !== rootHost) return null
                currentUrl = nextUrl
                continue
            } catch {
                return null
            }
        }

        const contentType = response.headers.get("content-type") || ""
        if (!contentType.includes("text/html")) return null

        let html = ""
        try {
            html = await response.text()
        } catch {
            return null
        }

        return { response, url: currentUrl, html }
    }

    return null
}

function gradeFor(score: number) {
    if (score >= 85) return "Revenue-ready"
    if (score >= 65) return "Leaky"
    return "Missing revenue"
}

function buildOpportunities(result: CrawlResponse) {
    const opportunities: string[] = []
    const pages = result.pages
    const primary = pages[0]
    const hasAnyForm = pages.some((page) => page.hasForm)
    const hasAnyPhone = pages.some((page) => page.hasPhone)
    const hasAnyEmail = pages.some((page) => page.hasEmail)
    const hasAnyTrust = pages.some((page) => page.trustCount > 0)
    const hasAnySchema = pages.some((page) => page.schemaCount > 0)

    if (!hasAnyForm) opportunities.push("Add a short quote or audit form to the homepage and contact page.")
    if (!hasAnyPhone) opportunities.push("Expose the phone number in the header, footer, and service pages.")
    if (!hasAnyEmail) opportunities.push("Publish a direct email address so high-intent leads do not have to hunt for contact info.")
    if (primary && primary.ctaCount < 3) opportunities.push("Replace generic buttons with specific actions like call, quote, book, or audit.")
    if (!hasAnyTrust) opportunities.push("Add reviews, testimonials, licenses, case studies, or project proof above the fold.")
    if (!hasAnySchema) opportunities.push("Add LocalBusiness, Service, FAQ, or Review schema to help search engines understand the offer.")
    if (result.pagesCrawled < 3) opportunities.push("Build more service and location pages so the crawler can find stronger search entry points.")
    if (result.internalLinks < 4) opportunities.push("Strengthen internal links so visitors can move from intent to contact in fewer clicks.")

    return opportunities.slice(0, 5)
}

function leadPriorityFor(score: number, pagesCrawled: number): "high" | "medium" | "low" {
    if (score < 55 || pagesCrawled < 2) return "high"
    if (score < 75) return "medium"
    return "low"
}

function buildPackageDrafts(result: CrawlResponse): PhaseTwoResponse["packageDrafts"] {
    const primaryPage = result.pages[0]
    const topFindings = result.opportunities.slice(0, 3)
    const serviceAreaSummary = primaryPage?.title || primaryPage?.description || "the homepage and core service pages"

    return {
        visibilityAudit: {
            title: "Visibility Audit",
            summary: `A concise review of ${serviceAreaSummary} showing what is blocking calls, quotes, and booked jobs.`,
            priorityFindings: topFindings.length > 0 ? topFindings : ["No obvious blockers found from the first crawl pass."],
            recommendedActions: [
                "Review the highest-leverage on-page issues first.",
                "Map each issue to a specific owner: web, content, sales, or CRM.",
                "Convert the audit into a tracked follow-up task list.",
            ],
            folderName: "Visibility Audit",
        },
        whatIfPackage: {
            title: "What-If Package",
            summary: "A scenario-based package showing what changes are worth making first, what they unlock, and what the follow-up workflow should create.",
            priorityFindings: [
                `Current score: ${result.score}/100 (${result.grade})`,
                `${result.pagesCrawled} page${result.pagesCrawled === 1 ? "" : "s"} crawled`,
                `${result.internalLinks} internal link${result.internalLinks === 1 ? "" : "s"} discovered`,
            ],
            recommendedActions: [
                "Bundle the findings into a client-ready proposal.",
                "Attach the crawl output to the CRM record before assignment.",
                "Route the package to the next internal review step after generation.",
            ],
            folderName: "What-If Package",
        },
    }
}

function buildAutomation(result: CrawlResponse, leadPriority: PhaseTwoResponse["leadPriority"]): PhaseTwoAutomation {
    const primaryAction = result.opportunities[0] || "Review crawl findings and create the first audit draft."

    return {
        trigger: "new_lead_detected",
        workflow:
            "When the crawler finds a qualified lead, generate the visibility audit, generate the what-if package, save both artifacts, and update the CRM record with the next action.",
        recommendedTools: ["Make", "n8n", "Zapier"],
        crmUpdate: [
            "Set lead source to website crawler",
            `Mark lead priority as ${leadPriority}`,
            "Store crawl score, grade, and page count on the CRM record",
            "Attach the generated audit package URL or file path",
            `Set next action to: ${primaryAction}`,
        ],
        saveTargets: [
            "Visibility Audit folder",
            "What-If Package folder",
            "CRM attachment or file note",
        ],
    }
}

function buildLeadCrawlSubject(result: CrawlResponse) {
    return `Lead Crawl Package: ${result.grade} (${result.score}/100)`
}

function buildLeadCrawlText(result: PhaseTwoResponse, sourceUrl: string) {
    const packageDraft = result.packageDrafts.visibilityAudit
    const whatIfDraft = result.packageDrafts.whatIfPackage

    return [
        "New lead crawl package",
        "",
        `Source URL: ${sourceUrl}`,
        `Score: ${result.score}/100`,
        `Grade: ${result.grade}`,
        `Priority: ${result.leadPriority}`,
        `Pages crawled: ${result.pagesCrawled}`,
        `Internal links: ${result.internalLinks}`,
        "",
        "Signals:",
        ...result.signals.map((signal) => `- ${signal}`),
        "",
        "Top opportunities:",
        ...result.opportunities.map((opportunity) => `- ${opportunity}`),
        "",
        `${packageDraft.title}:`,
        packageDraft.summary,
        ...packageDraft.priorityFindings.map((finding) => `- ${finding}`),
        ...packageDraft.recommendedActions.map((action) => `- ${action}`),
        "",
        `${whatIfDraft.title}:`,
        whatIfDraft.summary,
        ...whatIfDraft.priorityFindings.map((finding) => `- ${finding}`),
        ...whatIfDraft.recommendedActions.map((action) => `- ${action}`),
        "",
        "Automation handoff:",
        `Trigger: ${result.automation.trigger}`,
        `Workflow: ${result.automation.workflow}`,
        `Tools: ${result.automation.recommendedTools.join(", ")}`,
        ...result.automation.crmUpdate.map((line) => `- ${line}`),
        "",
        "Destination:",
        ...result.delivery.configuredTargets.map((target) => `- ${target}`),
    ].join("\n")
}

function buildDeliveryPayload(result: PhaseTwoResponse, sourceUrl: string) {
    return {
        sourceUrl,
        generatedAt: new Date().toISOString(),
        ...result,
    }
}

async function deliverPackage(result: PhaseTwoResponse, sourceUrl: string) {
    const configuredTargets: string[] = []
    const deliveredTargets: string[] = []
    const failedTargets: string[] = []

    const apiKey = process.env.RESEND_API_KEY
    const toEmail = process.env.LEAD_CRAWL_TO_EMAIL || process.env.AUDIT_TO_EMAIL
    const fromEmail = process.env.LEAD_CRAWL_FROM_EMAIL || process.env.AUDIT_FROM_EMAIL
    const webhookUrl = process.env.LEAD_CRAWL_WEBHOOK_URL

    if (apiKey && toEmail && fromEmail) configuredTargets.push(`email:${toEmail}`)
    if (webhookUrl) configuredTargets.push(`webhook:${webhookUrl}`)

    if (configuredTargets.length === 0) {
        return {
            status: "not_configured" as const,
            configuredTargets,
            deliveredTargets,
            failedTargets,
        }
    }

    if (apiKey && toEmail && fromEmail) {
        try {
            const resend = new Resend(apiKey)
            const { error } = await resend.emails.send({
                from: fromEmail,
                to: [toEmail],
                subject: buildLeadCrawlSubject(result),
                text: buildLeadCrawlText(result, sourceUrl),
                replyTo: fromEmail,
            })

            if (error) {
                failedTargets.push(`email:${toEmail}`)
            } else {
                deliveredTargets.push(`email:${toEmail}`)
            }
        } catch {
            failedTargets.push(`email:${toEmail}`)
        }
    }

    if (webhookUrl) {
        try {
            const response = await fetch(webhookUrl, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify(buildDeliveryPayload(result, sourceUrl)),
            })

            if (!response.ok) {
                failedTargets.push(`webhook:${webhookUrl}`)
            } else {
                deliveredTargets.push(`webhook:${webhookUrl}`)
            }
        } catch {
            failedTargets.push(`webhook:${webhookUrl}`)
        }
    }

    return {
        status:
            failedTargets.length === 0
                ? "sent"
                : deliveredTargets.length > 0
                    ? "partial"
                    : "failed",
        configuredTargets,
        deliveredTargets,
        failedTargets,
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST")
        return res.status(405).json({ error: "Method not allowed" })
    }

    let body: LeadCrawlBody = {}
    try {
        body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {}) as LeadCrawlBody
    } catch {
        return res.status(400).json({ error: "Body must be valid JSON" })
    }

    const rawUrl = text(body.url)
    if (!rawUrl) return res.status(400).json({ error: "url is required" })

    const maxPages = Math.min(Math.max(toInt(body.maxPages, 5), 1), 8)
    const candidateUrl = rawUrl.startsWith("http://") || rawUrl.startsWith("https://") ? rawUrl : `https://${rawUrl}`

    let startUrl: URL
    try {
        startUrl = new URL(candidateUrl)
    } catch {
        return res.status(400).json({ error: "url must be a valid http or https address" })
    }

    if (!["http:", "https:"].includes(startUrl.protocol)) {
        return res.status(400).json({ error: "url must use http or https" })
    }

    if (!(await isPublicHostname(startUrl.hostname))) {
        return res.status(400).json({ error: "url must resolve to a public hostname" })
    }

    const rootHost = normalizeHost(startUrl.hostname)
    const visited = new Set<string>()
    const queue = [normalizeUrl(startUrl)]
    const discovered = new Set<string>(queue)
    const pages: CrawledPage[] = []
    const userAgent = "MainStreetLeadCrawler/1.0 (+https://main-street-media-co.vercel.app)"

    while (queue.length > 0 && pages.length < maxPages) {
        const currentUrl = queue.shift()
        if (!currentUrl || visited.has(currentUrl)) continue
        visited.add(currentUrl)

        let response: Response
        try {
            response = await fetch(currentUrl, {
                headers: {
                    "user-agent": userAgent,
                    accept: "text/html,application/xhtml+xml",
                },
                redirect: "follow",
            })
        } catch {
            continue
        }

        const contentType = response.headers.get("content-type") || ""
        if (!contentType.includes("text/html")) continue

        let html = ""
        try {
            html = await response.text()
        } catch {
            continue
        }

        const parsedUrl = new URL(response.url || currentUrl)
        if (normalizeHost(parsedUrl.hostname) !== rootHost) continue

        const { page, links } = parsePage(parsedUrl, html)
        pages.push(page)

        for (const link of links) {
            if (visited.has(link) || discovered.has(link)) continue

            try {
                const linkedUrl = new URL(link)
                if (normalizeHost(linkedUrl.hostname) !== rootHost) continue
                discovered.add(link)
                if (queue.length + pages.length < maxPages) {
                    queue.push(link)
                }
            } catch {
                continue
            }
        }
    }

    const leadSignals = [
        `Scanned ${pages.length} page${pages.length === 1 ? "" : "s"}`,
        `${countPages(pages, (page) => page.hasForm)} page${countPages(pages, (page) => page.hasForm) === 1 ? "" : "s"} with forms`,
        `${countPages(pages, (page) => page.hasPhone || page.hasEmail)} page${countPages(pages, (page) => page.hasPhone || page.hasEmail) === 1 ? "" : "s"} with direct contact signals`,
        `${countPages(pages, (page) => page.trustCount > 0)} page${countPages(pages, (page) => page.trustCount > 0) === 1 ? "" : "s"} with trust language`,
        `${countPages(pages, (page) => page.schemaCount > 0)} page${countPages(pages, (page) => page.schemaCount > 0) === 1 ? "" : "s"} with schema`,
    ]

    const score = Math.min(
        100,
        [
            pages.some((page) => page.title) ? 12 : 0,
            pages.some((page) => page.description) ? 10 : 0,
            pages.some((page) => page.hasForm) ? 18 : 0,
            pages.some((page) => page.hasPhone || page.hasEmail) ? 16 : 0,
            pages.some((page) => page.ctaCount >= 3) ? 14 : 0,
            pages.some((page) => page.trustCount > 0) ? 12 : 0,
            pages.some((page) => page.schemaCount > 0) ? 10 : 0,
            pages.length > 1 ? 8 : 0,
        ].reduce((sum, value) => sum + value, 0) + (pages.length >= 4 ? 5 : pages.length >= 2 ? 3 : 0) + (pages.some((page) => page.hasPhone && page.hasForm) ? 5 : 0),
    )

    const leadPriority = leadPriorityFor(score, pages.length)
    const baseResponse: CrawlResponse = {
        inputUrl: normalizeUrl(startUrl),
        score,
        grade: gradeFor(score),
        summary: `The scan found ${pages.length} public page${pages.length === 1 ? "" : "s"} and ${countPages(pages, (page) => page.hasForm)} page${countPages(pages, (page) => page.hasForm) === 1 ? "" : "s"} with a form. This is enough to identify where clicks are leaking before they become calls or quotes.`,
        pagesCrawled: pages.length,
        internalLinks: Math.max(0, discovered.size - 1),
        signals: leadSignals,
        opportunities: [],
        pages,
    }

    const opportunities = buildOpportunities(baseResponse)
    const crawlResult: CrawlResponse = { ...baseResponse, opportunities }

    const response: PhaseTwoResponse = {
        ...crawlResult,
        phase: "discovery",
        leadPriority,
        packageDrafts: buildPackageDrafts(crawlResult),
        automation: buildAutomation(crawlResult, leadPriority),
        delivery: {
            status: "not_configured",
            configuredTargets: [],
            deliveredTargets: [],
            failedTargets: [],
        },
    }

    response.delivery = await deliverPackage(response, normalizeUrl(startUrl))

    res.setHeader("Cache-Control", "no-store")
    return res.status(200).json(response)
}
