type LeadPriority = "high" | "medium" | "low"

export type CrawledPage = {
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

export type CrawledBusiness = {
    inputUrl: string
    score: number
    grade: string
    summary: string
    pagesCrawled: number
    internalLinks: number
    signals: string[]
    opportunities: string[]
    pages: CrawledPage[]
    leadPriority?: LeadPriority
    businessName?: string
    source?: string
    crawledAt?: string
}

type VisibilityCheckStatus = "strong" | "partial" | "missing"

export type VisibilityCheck = {
    label: string
    status: VisibilityCheckStatus
    detail: string
}

export type AuditDocument = {
    title: string
    summary: string
    folderName: string
    fileName: string
    path: string
    priorityFindings: string[]
    recommendedActions: string[]
    checks: VisibilityCheck[]
    content: string
    plainText: string
}

export type AuditArtifact = {
    kind: "reveal_visibility_audit" | "what_if_package"
    title: string
    folderName: string
    fileName: string
    path: string
    mimeType: "text/markdown"
    content: string
}

export type SavePlanStep = {
    channel: "google_drive" | "canva" | "slack" | "crm"
    destination: string
    action: string
}

export type AuditBundle = {
    engine: "phase-2-audit-engine"
    generatedAt: string
    bundleId: string
    source: Required<CrawledBusiness>
    documents: {
        revealVisibilityAudit: AuditDocument
        whatIfPackage: AuditDocument
    }
    artifacts: AuditArtifact[]
    structure: {
        rootFolder: string
        folders: Array<{
            name: string
            path: string
            files: Array<Pick<AuditArtifact, "fileName" | "path" | "title" | "kind">>
        }>
    }
    savePlan: SavePlanStep[]
}

export type PersistedAuditBundle = {
    outputDir: string
    writtenFiles: string[]
}

function text(value: unknown) {
    return typeof value === "string" ? value.trim() : ""
}

function normalizeArray(values: unknown, fallback: string[] = []) {
    if (!Array.isArray(values)) return fallback
    return values.map((value) => text(value)).filter(Boolean)
}

function slugify(value: string) {
    return value
        .toLowerCase()
        .replace(/https?:\/\//g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48) || "audit"
}

function nowStamp() {
    return new Date().toISOString().replace(/[:.]/g, "-")
}

function requiredBusiness(input: CrawledBusiness): Required<CrawledBusiness> {
    return {
        inputUrl: text(input.inputUrl),
        score: Number.isFinite(input.score) ? input.score : 0,
        grade: text(input.grade) || "Unknown",
        summary: text(input.summary),
        pagesCrawled: Number.isFinite(input.pagesCrawled) ? input.pagesCrawled : 0,
        internalLinks: Number.isFinite(input.internalLinks) ? input.internalLinks : 0,
        signals: normalizeArray(input.signals),
        opportunities: normalizeArray(input.opportunities),
        pages: Array.isArray(input.pages)
            ? input.pages.map((page) => ({
                  url: text(page.url),
                  title: text(page.title),
                  description: text(page.description),
                  hasForm: Boolean(page.hasForm),
                  hasPhone: Boolean(page.hasPhone),
                  hasEmail: Boolean(page.hasEmail),
                  ctaCount: Number.isFinite(page.ctaCount) ? page.ctaCount : 0,
                  trustCount: Number.isFinite(page.trustCount) ? page.trustCount : 0,
                  schemaCount: Number.isFinite(page.schemaCount) ? page.schemaCount : 0,
              }))
            : [],
        leadPriority: input.leadPriority ?? "medium",
        businessName: text(input.businessName) || "Unknown business",
        source: text(input.source) || "lead-crawler",
        crawledAt: text(input.crawledAt) || new Date().toISOString(),
    }
}

function buildVisibilityChecks(source: Required<CrawledBusiness>): VisibilityCheck[] {
    const primaryPage = source.pages[0]
    const hasAnyForm = source.pages.some((page) => page.hasForm)
    const hasAnyPhone = source.pages.some((page) => page.hasPhone)
    const hasAnyEmail = source.pages.some((page) => page.hasEmail)
    const hasAnyTrust = source.pages.some((page) => page.trustCount > 0)
    const hasAnySchema = source.pages.some((page) => page.schemaCount > 0)
    const hasEnoughDepth = source.pagesCrawled >= 3
    const hasEnoughLinks = source.internalLinks >= 4

    return [
        {
            label: "Conversion path",
            status: hasAnyForm ? "strong" : "missing",
            detail: hasAnyForm
                ? "At least one crawl target includes a conversion form."
                : "No quote, audit, or contact form was found on the crawled pages.",
        },
        {
            label: "Direct contact",
            status: hasAnyPhone && hasAnyEmail ? "strong" : hasAnyPhone || hasAnyEmail ? "partial" : "missing",
            detail: hasAnyPhone || hasAnyEmail
                ? "Direct contact data is present, but it is not consistently available across the site."
                : "The crawl did not find a usable phone number or email address.",
        },
        {
            label: "Call-to-action clarity",
            status: primaryPage && primaryPage.ctaCount >= 3 ? "strong" : "partial",
            detail: primaryPage
                ? `The primary page surfaced ${primaryPage.ctaCount} action-oriented cues.`
                : "No primary page was available for CTA analysis.",
        },
        {
            label: "Trust signals",
            status: hasAnyTrust ? "strong" : "missing",
            detail: hasAnyTrust
                ? "The crawl found reviews, testimonials, case studies, or related proof language."
                : "No obvious trust, proof, or authority language was found.",
        },
        {
            label: "Structured data",
            status: hasAnySchema ? "strong" : "missing",
            detail: hasAnySchema
                ? "At least one page includes structured data."
                : "No JSON-LD or other structured data was detected in the crawl sample.",
        },
        {
            label: "Content depth",
            status: hasEnoughDepth ? "strong" : source.pagesCrawled === 2 ? "partial" : "missing",
            detail: hasEnoughDepth
                ? "The site exposes enough crawl depth to support a real audit package."
                : "The crawler found too few pages to build a deep package without follow-up research.",
        },
        {
            label: "Internal flow",
            status: hasEnoughLinks ? "strong" : source.internalLinks > 0 ? "partial" : "missing",
            detail: hasEnoughLinks
                ? "Internal linking is strong enough to support downstream conversion paths."
                : "The crawl found limited internal navigation between intent and contact pages.",
        },
    ]
}

function formatList(items: string[]) {
    if (items.length === 0) return "- None"
    return items.map((item) => `- ${item}`).join("\n")
}

function formatChecks(checks: VisibilityCheck[]) {
    return checks.map((check) => `- ${check.label} (${check.status}): ${check.detail}`).join("\n")
}

function markdownDocument(title: string, summary: string, sections: Array<{ heading: string; body: string }>) {
    return [
        `# ${title}`,
        "",
        summary,
        "",
        ...sections.flatMap((section) => [`## ${section.heading}`, "", section.body, ""]),
    ]
        .join("\n")
        .trim()
}

function plainTextDocument(markdown: string) {
    return markdown
        .replace(/^#\s+/gm, "")
        .replace(/^##\s+/gm, "")
        .replace(/\*\*/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
}

function estimateLift(score: number, floor: number, ceiling: number) {
    const gap = Math.max(0, 100 - score)
    return Math.max(floor, Math.min(ceiling, Math.round(gap / 6) + floor))
}

function buildDocumentPath(rootFolder: string, folderName: string, fileName: string) {
    return `${rootFolder}/${folderName}/${fileName}`
}

function buildDocument(
    rootFolder: string,
    kind: AuditArtifact["kind"],
    folderName: string,
    fileName: string,
    title: string,
    summary: string,
    sections: Array<{ heading: string; body: string }>,
    priorityFindings: string[],
    recommendedActions: string[],
    checks: VisibilityCheck[],
) {
    const path = buildDocumentPath(rootFolder, folderName, fileName)
    const content = markdownDocument(title, summary, sections)

    return {
        kind,
        title,
        folderName,
        fileName,
        path,
        mimeType: "text/markdown" as const,
        content,
        plainText: plainTextDocument(content),
        priorityFindings,
        recommendedActions,
        checks,
        summary,
    }
}

function buildSavePlan(rootFolder: string): SavePlanStep[] {
    return [
        {
            channel: "google_drive",
            destination: `${rootFolder}/Reveal Visibility Audit`,
            action: "Upload the Reveal Visibility Audit markdown file into the audit folder.",
        },
        {
            channel: "google_drive",
            destination: `${rootFolder}/What-If Package`,
            action: "Upload the What-If Package markdown file into the package folder.",
        },
        {
            channel: "canva",
            destination: rootFolder,
            action: "Use the markdown content as source text for a client-facing layout or deck.",
        },
        {
            channel: "slack",
            destination: "#crm-or-audit",
            action: "Post the audit summary, priority findings, and artifact links for review.",
        },
        {
            channel: "crm",
            destination: "lead record",
            action: "Attach both artifact paths and update the next-action field.",
        },
    ]
}

function buildRevealVisibilityAudit(source: Required<CrawledBusiness>, rootFolder: string) {
    const checks = buildVisibilityChecks(source)
    const topFindings = source.opportunities.slice(0, 5)
    const summary = source.summary || `A visibility audit for ${source.businessName} that turns the crawler output into a structured action plan.`
    const scoreContext = `${source.score}/100 (${source.grade})`

    return buildDocument(
        rootFolder,
        "reveal_visibility_audit",
        "Reveal Visibility Audit",
        "reveal-visibility-audit.md",
        "Reveal Visibility Audit",
        summary,
        [
            { heading: "Audit snapshot", body: `- Source URL: ${source.inputUrl}\n- Score: ${scoreContext}\n- Pages crawled: ${source.pagesCrawled}\n- Internal links: ${source.internalLinks}\n- Lead priority: ${source.leadPriority}` },
            { heading: "Visibility checks", body: formatChecks(checks) },
            { heading: "Priority findings", body: formatList(topFindings.length > 0 ? topFindings : ["No obvious blockers surfaced on the first pass."]) },
            { heading: "Recommended actions", body: formatList([
                "Review the strongest conversion leaks first.",
                "Assign each finding to the right owner: web, content, operations, or CRM.",
                "Save the audit into the customer record before any follow-up automation runs.",
            ]) },
        ],
        topFindings.length > 0 ? topFindings : ["No obvious blockers surfaced on the first pass."],
        [
            "Review the strongest conversion leaks first.",
            "Assign each finding to the right owner: web, content, operations, or CRM.",
            "Save the audit into the customer record before any follow-up automation runs.",
        ],
        checks,
    )
}

function buildWhatIfPackage(source: Required<CrawledBusiness>, rootFolder: string) {
    const checks = buildVisibilityChecks(source)
    const quickLift = estimateLift(source.score, 5, 14)
    const growthLift = estimateLift(source.score, 10, 24)
    const expansionLift = estimateLift(source.score, 15, 32)
    const primaryPage = source.pages[0]
    const focusLine = primaryPage?.title || primaryPage?.description || "the homepage and core service pages"

    return buildDocument(
        rootFolder,
        "what_if_package",
        "What-If Package",
        "what-if-package.md",
        "What-If Package",
        `A scenario package for ${source.businessName} showing what the next round of fixes could unlock.`,
        [
            { heading: "Scenario model", body: `- Quick wins: estimated lift of ${quickLift} points if the highest-friction leaks are removed.\n- Growth path: estimated lift of ${growthLift} points if the site adds stronger trust, CTA, and contact coverage.\n- Expansion path: estimated lift of ${expansionLift} points if the full package is implemented across the site and CRM.` },
            { heading: "Business context", body: `- Starting point: ${source.score}/100 (${source.grade})\n- Crawl depth: ${source.pagesCrawled} pages\n- Internal links: ${source.internalLinks}\n- Main focus area: ${focusLine}` },
            { heading: "Operational handoff", body: formatList([
                "Turn the audit into a client-ready proposal or sales follow-up.",
                "Attach the output to the CRM record before automation starts.",
                "Route the package to the next internal review step after generation.",
            ]) },
            { heading: "Included checks", body: formatChecks(checks) },
        ],
        [
            `Current score: ${source.score}/100 (${source.grade})`,
            `${source.pagesCrawled} page${source.pagesCrawled === 1 ? "" : "s"} crawled`,
            `${source.internalLinks} internal link${source.internalLinks === 1 ? "" : "s"} discovered`,
        ],
        [
            "Turn the audit into a client-ready proposal or sales follow-up.",
            "Attach the output to the CRM record before automation starts.",
            "Route the package to the next internal review step after generation.",
        ],
        checks,
    )
}

export function generateAuditBundle(input: CrawledBusiness): AuditBundle {
    const source = requiredBusiness(input)
    const generatedAt = source.crawledAt || new Date().toISOString()
    const bundleId = `${slugify(source.businessName || source.inputUrl)}-${nowStamp()}`
    const rootFolder = `audit-bundles/${bundleId}`

    const revealVisibilityAudit = buildRevealVisibilityAudit(source, rootFolder)
    const whatIfPackage = buildWhatIfPackage(source, rootFolder)

    const artifacts: AuditArtifact[] = [
        {
            kind: "reveal_visibility_audit",
            title: revealVisibilityAudit.title,
            folderName: revealVisibilityAudit.folderName,
            fileName: revealVisibilityAudit.fileName,
            path: revealVisibilityAudit.path,
            mimeType: "text/markdown",
            content: revealVisibilityAudit.content,
        },
        {
            kind: "what_if_package",
            title: whatIfPackage.title,
            folderName: whatIfPackage.folderName,
            fileName: whatIfPackage.fileName,
            path: whatIfPackage.path,
            mimeType: "text/markdown",
            content: whatIfPackage.content,
        },
    ]

    return {
        engine: "phase-2-audit-engine",
        generatedAt,
        bundleId,
        source,
        documents: {
            revealVisibilityAudit,
            whatIfPackage,
        },
        artifacts,
        structure: {
            rootFolder,
            folders: [
                {
                    name: revealVisibilityAudit.folderName,
                    path: `${rootFolder}/${revealVisibilityAudit.folderName}`,
                    files: [
                        {
                            fileName: revealVisibilityAudit.fileName,
                            path: revealVisibilityAudit.path,
                            title: revealVisibilityAudit.title,
                            kind: "reveal_visibility_audit",
                        },
                    ],
                },
                {
                    name: whatIfPackage.folderName,
                    path: `${rootFolder}/${whatIfPackage.folderName}`,
                    files: [
                        {
                            fileName: whatIfPackage.fileName,
                            path: whatIfPackage.path,
                            title: whatIfPackage.title,
                            kind: "what_if_package",
                        },
                    ],
                },
            ],
        },
        savePlan: buildSavePlan(rootFolder),
    }
}

export async function persistAuditBundle(bundle: AuditBundle, outputDir: string): Promise<PersistedAuditBundle> {
    const fs = await import("fs/promises")
    const path = await import("path")

    const rootPath = path.join(outputDir, bundle.structure.rootFolder)
    const writtenFiles: string[] = []

    for (const folder of bundle.structure.folders) {
        const folderPath = path.join(outputDir, folder.path)
        await fs.mkdir(folderPath, { recursive: true })

        for (const file of folder.files) {
            const artifact = bundle.artifacts.find((item) => item.path === file.path)
            if (!artifact) continue

            const filePath = path.join(outputDir, file.path)
            await fs.writeFile(filePath, artifact.content, "utf8")
            writtenFiles.push(filePath)
        }
    }

    return {
        outputDir: rootPath,
        writtenFiles,
    }
}
