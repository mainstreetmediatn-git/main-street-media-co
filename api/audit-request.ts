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

type AuditRequestBody = {
    name?: unknown
    businessName?: unknown
    phone?: unknown
    email?: unknown
    website?: unknown
    industry?: unknown
    biggestProblem?: unknown
    companyWebsite?: unknown
}

function text(value: unknown) {
    return typeof value === "string" ? value.trim() : ""
}

function requiredFieldErrors(body: AuditRequestBody) {
    const errors: string[] = []

    if (!text(body.name)) errors.push("name is required")
    if (!text(body.businessName)) errors.push("businessName is required")
    if (!text(body.industry)) errors.push("industry is required")
    if (!text(body.biggestProblem)) errors.push("biggestProblem is required")
    if (!text(body.email) && !text(body.phone)) errors.push("either email or phone is required")

    return errors
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST")
        return res.status(405).json({ error: "Method not allowed" })
    }

    const body = (req.body ?? {}) as AuditRequestBody

    if (text(body.companyWebsite)) {
        return res.status(200).json({ ok: true })
    }

    const errors = requiredFieldErrors(body)
    if (errors.length > 0) {
        return res.status(400).json({ error: "Invalid audit request", errors })
    }

    const apiKey = process.env.RESEND_API_KEY
    const toEmail = process.env.AUDIT_TO_EMAIL
    const fromEmail = process.env.AUDIT_FROM_EMAIL

    if (!apiKey || !toEmail || !fromEmail) {
        return res.status(500).json({ error: "Email delivery is not configured" })
    }

    const name = text(body.name)
    const businessName = text(body.businessName)
    const phone = text(body.phone) || "Not provided"
    const email = text(body.email) || "Not provided"
    const website = text(body.website) || "Not provided"
    const industry = text(body.industry)
    const biggestProblem = text(body.biggestProblem)

    const resend = new Resend(apiKey)

    const { error } = await resend.emails.send({
        from: fromEmail,
        to: [toEmail],
        subject: `Free Visibility Audit Request: ${businessName}`,
        replyTo: text(body.email) || undefined,
        text: [
            "New Free Visibility Audit request",
            "",
            `Name: ${name}`,
            `Business Name: ${businessName}`,
            `Phone: ${phone}`,
            `Email: ${email}`,
            `Website: ${website}`,
            `Industry: ${industry}`,
            "",
            "Biggest Problem:",
            biggestProblem,
        ].join("\n"),
    })

    if (error) {
        return res.status(502).json({ error: "Email delivery failed" })
    }

    return res.status(200).json({ ok: true })
}
