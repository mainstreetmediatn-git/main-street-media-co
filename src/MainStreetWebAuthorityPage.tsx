import * as React from "react"
import { useState } from "react"
import { webAuthorityArticles } from "./data/webAuthorityArticles"

type AuditFormState = {
    name: string
    businessName: string
    phone: string
    email: string
    website: string
    industry: string
    biggestProblem: string
    companyWebsite: string
}

type Card = {
    title: string
    body: string
}

const initialForm: AuditFormState = {
    name: "",
    businessName: "",
    phone: "",
    email: "",
    website: "",
    industry: "",
    biggestProblem: "",
    companyWebsite: "",
}

type SubmissionStatus = "idle" | "submitting" | "sent" | "fallback"

const services: Card[] = [
    {
        title: "Findability Foundation",
        body: "Service pages, local terms, city signals, metadata, and Google alignment mapped around how customers actually search.",
    },
    {
        title: "Trust Architecture",
        body: "Reviews, proof, process details, credentials, and authority cues placed where buyers make the call-or-keep-searching decision.",
    },
    {
        title: "Conversion Flow",
        body: "Mobile-first calls, quote paths, offer clarity, and next-step prompts that reduce friction for ready-to-buy searchers.",
    },
    {
        title: "Authority Content",
        body: "Educational content that supports service depth, local relevance, and future ranking opportunities without empty keyword stuffing.",
    },
]

const painPoints: Card[] = [
    {
        title: "Weak Service Pages",
        body: "Core services are not clearly explained in the language customers use to search.",
    },
    {
        title: "Missing Local Signals",
        body: "Google and customers do not see enough relevance for your city, service area, and specialty.",
    },
    {
        title: "No Trust Architecture",
        body: "Reviews, proof, process, licensing, and credibility cues are not doing enough work.",
    },
    {
        title: "Poor Conversion Flow",
        body: "Visitors have to work too hard to call, ask for a quote, or choose the next step.",
    },
]

const process = [
    {
        number: "01",
        title: "Findability",
        body: "Make every key service easier for Google and customers to understand.",
    },
    {
        number: "02",
        title: "Trust",
        body: "Bring reviews, proof, process, and credibility into the buying path.",
    },
    {
        number: "03",
        title: "Clarity",
        body: "Say what you do, where you do it, and why customers should choose you.",
    },
    {
        number: "04",
        title: "Conversion",
        body: "Turn visitors into calls, quote requests, and booked jobs with less friction.",
    },
    {
        number: "05",
        title: "Expansion",
        body: "Build authority content that supports more services, cities, and opportunities.",
    },
]

const industries = [
    "Roofers",
    "HVAC",
    "Plumbers",
    "Electricians",
    "Landscapers",
    "Tree Service",
    "Pest Control",
    "Cleaning Companies",
    "Remodelers",
    "Concrete Contractors",
    "Auto Repair",
    "Dentists",
    "Chiropractors",
    "Attorneys",
    "Restoration Companies",
]

const trustSignals = [
    "Local SEO",
    "Trust Signals",
    "Call Conversion",
    "Service-area relevance",
    "Website authority",
    "Google Business Profile alignment",
]

const fixFirst = [
    "Weak service pages",
    "Poor local keyword targeting",
    "Thin content",
    "Missing Google Business Profile alignment",
    "Weak calls-to-action",
    "Poor mobile experience",
    "Missing reviews",
    "No authority content strategy",
]

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 4200
 */
export default function MainStreetWebAuthorityPage(props: { style?: React.CSSProperties }) {
    const [form, setForm] = useState<AuditFormState>(initialForm)
    const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>("idle")
    const [contactError, setContactError] = useState("")

    React.useEffect(() => {
        const title = "Main Street Media Co. | Local Visibility, SEO, and Lead Conversion"
        const description = "Main Street Media Co. helps local service businesses improve Google visibility, earn trust, and turn website visitors into calls, quote requests, and predictable growth."
        const url = "https://mainstreetmediaco.com/"
        const image = "https://mainstreetmediaco.com/og-image.jpg"

        document.title = title
        setMeta("name", "description", description)
        setMeta("property", "og:title", title)
        setMeta("property", "og:description", description)
        setMeta("property", "og:type", "website")
        setMeta("property", "og:url", url)
        setMeta("property", "og:image", image)
        setMeta("name", "twitter:card", "summary_large_image")
        setMeta("name", "twitter:title", title)
        setMeta("name", "twitter:description", description)
        setMeta("name", "twitter:image", image)
        setCanonical(url)
    }, [])

    function updateField(field: keyof AuditFormState, value: string) {
        setForm((current) => ({ ...current, [field]: value }))
        if (field === "phone" || field === "email") {
            setContactError("")
        }
    }

    async function submitAuditRequest(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (!form.phone.trim() && !form.email.trim()) {
            setContactError("Please enter either an email address or phone number so we can follow up.")
            setSubmissionStatus("idle")
            return
        }

        setContactError("")
        setSubmissionStatus("submitting")

        try {
            const response = await fetch("/api/audit-request", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(form),
            })

            setSubmissionStatus(response.ok ? "sent" : "fallback")
        } catch {
            setSubmissionStatus("fallback")
        }
    }

    return (
        <main className="msm-page" style={props.style}>
            <style>{css}</style>

            <header className="msm-header">
                <nav className="msm-nav" aria-label="Main navigation">
                    <a className="msm-brand" href="#top" aria-label="Main Street Media Co. home">
                        <span className="msm-logo">MS</span>
                        <span>Main Street Media Co.</span>
                    </a>
                    <div className="msm-nav-links" aria-label="Homepage sections">
                        <a href="#services">Services</a>
                        <a href="#process">Process</a>
                        <a href="#web-authority">WebAuthority</a>
                        <a href="#audit-form">Audit</a>
                    </div>
                    <a className="msm-nav-cta" href="#audit-form">Request Free Visibility Audit</a>
                </nav>
            </header>

            <section id="top" className="msm-hero msm-section">
                <div className="msm-hero-copy">
                    <p className="msm-kicker">Helping Great Local Businesses Become Impossible to Ignore.</p>
                    <h1>Build a website Google trusts and customers choose.</h1>
                    <p className="msm-lede">
                        Main Street Media Co. helps local service businesses turn their website into a visibility engine built to rank, earn trust, and convert visitors into real calls, quote requests, and booked jobs.
                    </p>
                    <div className="msm-actions">
                        <a className="msm-button msm-button-primary" href="#audit-form">Request Your Free Visibility Audit</a>
                        <a className="msm-button msm-button-secondary" href="#pain">See What Is Holding Your Website Back</a>
                    </div>
                    <div className="msm-stat-strip" aria-label="Core outcomes">
                        <span>Local SEO</span>
                        <span>Trust Signals</span>
                        <span>Call Conversion</span>
                    </div>
                </div>

                <aside className="msm-dashboard" aria-label="Website authority snapshot">
                    <div className="msm-dashboard-top">
                        <span>Website Authority Snapshot</span>
                        <span>Local service website audit</span>
                    </div>
                    <div className="msm-score-wrap">
                        <div className="msm-score">72</div>
                        <span>baseline</span>
                    </div>
                    <div className="msm-metrics">
                        <Metric title="Findability" body="Service pages, local terms, and Google alignment." />
                        <Metric title="Trust" body="Reviews, proof, authority cues, and credibility." />
                        <Metric title="Conversion" body="Calls, quote requests, and next-step clarity." />
                        <Metric title="Local Signals" body="City, service area, and relevance cues." />
                    </div>
                    <div className="msm-gap-card">
                        <strong>Visibility gaps usually hide in plain sight.</strong>
                        <p>Service pages miss search intent, trust proof appears too late, and call paths are harder than they need to be.</p>
                    </div>
                </aside>
            </section>

            <section className="msm-section msm-proof-strip" aria-label="Trust and proof signals">
                {trustSignals.map((signal) => <span key={signal}>{signal}</span>)}
            </section>

            <section id="pain" className="msm-section msm-two-col">
                <div>
                    <p className="msm-eyebrow">The local visibility gap</p>
                    <h2>A pretty website is not enough anymore.</h2>
                    <p>
                        Local buyers move fast. They compare search results, reviews, websites, and trust signals in minutes. If your online presence is unclear, thin, slow, or generic, better-positioned competitors win the call.
                    </p>
                </div>
                <div className="msm-card-grid">
                    {painPoints.map((item) => (
                        <InfoCard key={item.title} title={item.title} body={item.body} />
                    ))}
                </div>
            </section>

            <section id="services" className="msm-section msm-services">
                <div className="msm-section-head">
                    <p className="msm-eyebrow">What we fix first</p>
                    <h2>Turn your website into a clearer path to calls, trust, and local relevance.</h2>
                </div>
                <div className="msm-services-grid">
                    {services.map((service) => (
                        <InfoCard key={service.title} title={service.title} body={service.body} />
                    ))}
                </div>
                <div className="msm-fix-grid" aria-label="Website authority issues fixed first">
                    {fixFirst.map((item) => <span key={item}>{item}</span>)}
                </div>
            </section>

            <section id="process" className="msm-section msm-process">
                <div className="msm-section-head">
                    <p className="msm-eyebrow">A practical authority system</p>
                    <h2>The Main Street Web Authority Framework</h2>
                </div>
                <div className="msm-process-grid">
                    {process.map((item) => (
                        <article className="msm-process-card" key={item.number}>
                            <span>{item.number}</span>
                            <h3>{item.title}</h3>
                            <p>{item.body}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section id="web-authority" className="msm-section msm-web-authority">
                <div className="msm-web-authority-copy">
                    <p className="msm-eyebrow">WebAuthority</p>
                    <h2>Authority content for local companies that want to educate, rank, and convert.</h2>
                    <p>
                        WebAuthority is Main Street Media Co.'s education hub for local SEO, reputation, website authority, and conversion. It gives owners plain-English guidance they can use before spending more on ads.
                    </p>
                    <div className="msm-actions">
                        <a className="msm-button msm-button-primary" href="/web-authority">Visit WebAuthority</a>
                        <a className="msm-button msm-button-secondary" href="/web-authority/articles">Browse Articles</a>
                    </div>
                </div>
                <div className="msm-article-preview">
                    {webAuthorityArticles.slice(0, 3).map((article) => (
                        <a href={`/web-authority/${article.slug}`} key={article.slug}>
                            <span>{article.category}</span>
                            <strong>{article.title}</strong>
                            <small>{article.readTime}</small>
                        </a>
                    ))}
                </div>
            </section>

            <section id="industries" className="msm-section msm-two-col msm-industries">
                <div>
                    <p className="msm-eyebrow">Industries served</p>
                    <h2>Built for service businesses where timing, reputation, and local trust matter.</h2>
                    <p>
                        The system is designed for companies that win through proximity, proof, fast response, and clear expertise.
                    </p>
                </div>
                <div className="msm-industry-grid">
                    {industries.map((industry) => <span key={industry}>{industry}</span>)}
                </div>
            </section>

            <section id="proof" className="msm-section msm-proof">
                <div className="msm-proof-panel">
                    <div>
                        <p className="msm-eyebrow">Proof and trust</p>
                        <h2>Credibility built into the path from search to sale.</h2>
                        <p>
                            Main Street Media Co. focuses on the practical signals customers and search engines both need: clarity, relevance, proof, and a low-friction path to action.
                        </p>
                    </div>
                    <div className="msm-trust-grid">
                        {trustSignals.map((signal) => <span key={signal}>{signal}</span>)}
                    </div>
                </div>
                <div className="msm-before-after">
                    <article>
                        <span>Before</span>
                        <p>Low rankings, unclear messaging, weak service pages, poor lead flow, and missing trust signals.</p>
                    </article>
                    <article>
                        <span>After</span>
                        <p>Stronger Google relevance, better customer trust, clearer positioning, more qualified calls, and stronger Google Business Profile support.</p>
                    </article>
                </div>
            </section>

            <section id="audit-form" className="msm-section msm-audit-section">
                <div>
                    <p className="msm-eyebrow">Free visibility audit</p>
                    <h2>See what is holding your website back before your next customer searches.</h2>
                    <p>
                        We will review the signals that help local customers find you, trust you, and take action. No fake guarantees, just a clear look at what can be improved.
                    </p>
                    <div className="msm-audit-points">
                        <span>Website clarity</span>
                        <span>Local SEO gaps</span>
                        <span>Trust signals</span>
                        <span>Lead path friction</span>
                    </div>
                </div>

                <form className="msm-form" onSubmit={submitAuditRequest}>
                    {submissionStatus === "sent" && (
                        <div className="msm-form-success msm-full" role="status" aria-live="polite">
                            <strong>Audit request sent.</strong>
                            <p>Your audit request has been sent. Main Street Media Co. will review it and follow up soon.</p>
                        </div>
                    )}
                    {submissionStatus === "fallback" && (
                        <div className="msm-form-success msm-full" role="status" aria-live="polite">
                            <strong>Audit request prepared.</strong>
                            <p>Your audit request has been prepared. Until automated delivery is connected, please email mainstreetmediatn@gmail.com or call 949-447-4490.</p>
                        </div>
                    )}
                    <div className="msm-form-note msm-full">
                        <strong>Manual delivery fallback:</strong>
                        <span>Email <a href="mailto:mainstreetmediatn@gmail.com">mainstreetmediatn@gmail.com</a> or call <a href="tel:+19494474490">949-447-4490</a>.</span>
                    </div>
                    <label className="msm-honeypot" aria-hidden="true">
                        Company Website
                        <input tabIndex={-1} autoComplete="off" value={form.companyWebsite} onChange={(e) => updateField("companyWebsite", e.target.value)} />
                    </label>
                    <label>
                        Name
                        <input required value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="Your name" />
                    </label>
                    <label>
                        Business Name
                        <input required value={form.businessName} onChange={(e) => updateField("businessName", e.target.value)} placeholder="Company name" />
                    </label>
                    <label>
                        Phone
                        <input type="tel" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="Best callback number" aria-describedby={contactError ? "audit-contact-error" : undefined} aria-invalid={Boolean(contactError)} />
                    </label>
                    <label>
                        Email
                        <input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} placeholder="you@example.com" aria-describedby={contactError ? "audit-contact-error" : undefined} aria-invalid={Boolean(contactError)} />
                    </label>
                    {contactError && (
                        <p id="audit-contact-error" className="msm-form-error msm-full" role="alert">
                            {contactError}
                        </p>
                    )}
                    <label>
                        Website
                        <input type="url" value={form.website} onChange={(e) => updateField("website", e.target.value)} placeholder="https://example.com" />
                    </label>
                    <label>
                        Industry
                        <input required value={form.industry} onChange={(e) => updateField("industry", e.target.value)} placeholder="Roofing, HVAC, plumbing..." />
                    </label>
                    <label className="msm-full">
                        Biggest Problem
                        <textarea required value={form.biggestProblem} onChange={(e) => updateField("biggestProblem", e.target.value)} placeholder="Not enough calls, poor rankings, outdated website, weak reviews..." />
                    </label>
                    <button className="msm-button msm-button-primary msm-full" type="submit" disabled={submissionStatus === "submitting"}>
                        {submissionStatus === "submitting" ? "Sending Audit Request..." : "Request Free Visibility Audit"}
                    </button>
                </form>
            </section>

            <footer className="msm-footer">
                <div>
                    <strong>Main Street Media Co.</strong>
                    <p>Helping Great Local Businesses Become Impossible to Ignore.</p>
                </div>
                <a className="msm-button msm-button-secondary" href="#audit-form">Request Free Visibility Audit</a>
            </footer>
        </main>
    )
}

function Metric({ title, body }: Card) {
    return (
        <div className="msm-metric">
            <strong>{title}</strong>
            <span>{body}</span>
        </div>
    )
}

function InfoCard({ title, body }: Card) {
    return (
        <article className="msm-info-card">
            <h3>{title}</h3>
            <p>{body}</p>
        </article>
    )
}

function setMeta(attribute: "name" | "property", key: string, content: string) {
    let meta = document.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
    if (!meta) {
        meta = document.createElement("meta")
        meta.setAttribute(attribute, key)
        document.head.appendChild(meta)
    }
    meta.content = content
}

function setCanonical(href: string) {
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!link) {
        link = document.createElement("link")
        link.rel = "canonical"
        document.head.appendChild(link)
    }
    link.href = href
}

const css = `
:root {
    --msm-bg: #050807;
    --msm-bg-soft: #0c1512;
    --msm-panel: rgba(255, 255, 255, 0.075);
    --msm-panel-strong: rgba(255, 255, 255, 0.12);
    --msm-line: rgba(255, 255, 255, 0.14);
    --msm-text: #f8f4ea;
    --msm-muted: rgba(248, 244, 234, 0.72);
    --msm-gold: #d7a642;
    --msm-gold-soft: #f3cf73;
    --msm-teal: #53a487;
    --msm-ink: #07100d;
    --msm-radius: 22px;
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }

.msm-page {
    width: 100%;
    min-height: 100%;
    margin: 0;
    background:
        radial-gradient(circle at 14% 3%, rgba(215, 166, 66, 0.28), transparent 31rem),
        radial-gradient(circle at 92% 16%, rgba(83, 164, 135, 0.2), transparent 28rem),
        linear-gradient(180deg, #050807 0%, #0a1210 46%, #11100c 100%);
    color: var(--msm-text);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    line-height: 1.5;
    overflow-x: hidden;
}

.msm-page a { color: inherit; text-decoration: none; }
.msm-page h1,
.msm-page h2,
.msm-page h3,
.msm-page p { margin: 0; }

.msm-header {
    position: sticky;
    top: 0;
    z-index: 10;
    background: rgba(5, 8, 7, 0.78);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(18px);
}

.msm-nav {
    max-width: 1180px;
    margin: 0 auto;
    padding: 16px 22px;
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 22px;
}

.msm-brand {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    font-weight: 900;
}

.msm-logo {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    background: linear-gradient(135deg, var(--msm-gold-soft), var(--msm-teal));
    color: var(--msm-ink);
    font-weight: 950;
}

.msm-nav-links {
    display: flex;
    justify-content: center;
    gap: 24px;
    color: var(--msm-muted);
    font-size: 14px;
    font-weight: 800;
}

.msm-nav-links a:hover { color: var(--msm-text); }

.msm-nav-cta {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    min-height: 42px;
    padding: 10px 16px;
    border: 1px solid rgba(243, 207, 115, 0.45);
    border-radius: 999px;
    color: var(--msm-gold-soft);
    background: rgba(243, 207, 115, 0.08);
    font-weight: 900;
    font-size: 14px;
}

.msm-section {
    max-width: 1180px;
    margin: 0 auto;
    padding: 86px 22px;
}

.msm-hero {
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(340px, 0.95fr);
    align-items: center;
    gap: 46px;
    min-height: calc(100vh - 75px);
    padding-top: 72px;
    padding-bottom: 72px;
}

.msm-hero-copy h1 {
    max-width: 780px;
    margin-top: 18px;
    font-size: clamp(48px, 7.5vw, 88px);
    line-height: 0.95;
    letter-spacing: 0;
}

.msm-kicker,
.msm-eyebrow {
    color: var(--msm-gold-soft);
    font-weight: 950;
    text-transform: uppercase;
    font-size: 12px;
    letter-spacing: 0.12em;
}

.msm-lede {
    max-width: 660px;
    margin-top: 26px;
    font-size: clamp(18px, 2vw, 22px);
    color: var(--msm-muted);
}

.msm-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    margin-top: 34px;
}

.msm-button {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    min-height: 52px;
    padding: 14px 20px;
    border-radius: 999px;
    border: 1px solid transparent;
    font-weight: 950;
    cursor: pointer;
    transition: transform .2s ease, border-color .2s ease, background .2s ease;
}

.msm-button:hover { transform: translateY(-2px); }

.msm-button-primary {
    background: linear-gradient(135deg, var(--msm-gold-soft), var(--msm-gold));
    color: var(--msm-ink);
    box-shadow: 0 24px 70px rgba(215, 166, 66, 0.22);
}

.msm-button-secondary {
    background: rgba(255, 255, 255, 0.07);
    color: var(--msm-text);
    border-color: var(--msm-line);
}

.msm-stat-strip,
.msm-audit-points,
.msm-proof-strip,
.msm-fix-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 26px;
}

.msm-stat-strip span,
.msm-audit-points span,
.msm-industry-grid span,
.msm-trust-grid span,
.msm-proof-strip span,
.msm-fix-grid span {
    border: 1px solid var(--msm-line);
    background: rgba(255, 255, 255, 0.055);
    border-radius: 999px;
    color: var(--msm-muted);
    padding: 10px 14px;
    font-weight: 800;
}

.msm-stat-strip strong { color: var(--msm-text); }

.msm-dashboard,
.msm-info-card,
.msm-process-card,
.msm-proof-panel,
.msm-before-after article,
.msm-form,
.msm-web-authority,
.msm-article-preview a {
    border: 1px solid var(--msm-line);
    background: linear-gradient(180deg, var(--msm-panel-strong), var(--msm-panel));
    border-radius: var(--msm-radius);
    box-shadow: 0 30px 90px rgba(0, 0, 0, 0.28);
    backdrop-filter: blur(14px);
}

.msm-dashboard { padding: 24px; }

.msm-dashboard-top,
.msm-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 18px;
}

.msm-dashboard-top span:first-child { font-weight: 950; }
.msm-dashboard-top span:last-child { color: var(--msm-muted); font-size: 13px; }

.msm-score-wrap {
    margin: 28px 0;
    padding: 30px;
    border-radius: 20px;
    background:
        linear-gradient(135deg, rgba(243, 207, 115, 0.18), rgba(83, 164, 135, 0.1)),
        rgba(255, 255, 255, 0.055);
    text-align: center;
}

.msm-score {
    font-size: 92px;
    line-height: 1;
    font-weight: 950;
    color: var(--msm-gold-soft);
}

.msm-score-wrap span { color: var(--msm-muted); font-weight: 850; }

.msm-metrics {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

.msm-metric {
    padding: 16px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.06);
}

.msm-metric strong { display: block; margin-bottom: 6px; }
.msm-metric span { color: var(--msm-muted); font-size: 14px; }

.msm-gap-card {
    margin-top: 16px;
    padding: 18px;
    border-radius: 18px;
    background: rgba(5, 8, 7, 0.72);
}

.msm-gap-card p { margin-top: 8px; color: var(--msm-muted); }

.msm-two-col,
.msm-audit-section,
.msm-web-authority {
    display: grid;
    grid-template-columns: 0.86fr 1.14fr;
    gap: 36px;
    align-items: start;
}

.msm-two-col h2,
.msm-section-head h2,
.msm-audit-section h2,
.msm-proof-panel h2,
.msm-web-authority h2 {
    margin-top: 12px;
    max-width: 850px;
    font-size: clamp(34px, 4.1vw, 58px);
    line-height: 1;
    letter-spacing: 0;
}

.msm-two-col p,
.msm-audit-section p,
.msm-proof-panel p,
.msm-web-authority p {
    margin-top: 18px;
    color: var(--msm-muted);
    font-size: 18px;
}

.msm-card-grid,
.msm-services-grid,
.msm-process-grid,
.msm-before-after,
.msm-article-preview {
    display: grid;
    gap: 16px;
}

.msm-card-grid { grid-template-columns: 1fr 1fr; }
.msm-services-grid { grid-template-columns: repeat(4, 1fr); margin-top: 30px; }
.msm-process-grid { grid-template-columns: repeat(5, 1fr); margin-top: 30px; }
.msm-before-after { grid-template-columns: 1fr 1fr; margin-top: 16px; }

.msm-info-card,
.msm-process-card,
.msm-before-after article { padding: 22px; }

.msm-info-card h3,
.msm-process-card h3 { font-size: 20px; line-height: 1.15; margin-bottom: 10px; }
.msm-info-card p,
.msm-process-card p,
.msm-before-after p { color: var(--msm-muted); }

.msm-process-card span,
.msm-before-after span {
    display: inline-block;
    margin-bottom: 16px;
    color: var(--msm-gold-soft);
    font-weight: 950;
}

.msm-industry-grid,
.msm-trust-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
}

.msm-proof-panel {
    display: grid;
    grid-template-columns: 0.95fr 1.05fr;
    gap: 30px;
    align-items: center;
    padding: 30px;
}

.msm-proof-strip {
    padding-top: 0;
    padding-bottom: 0;
    justify-content: center;
    margin-top: -30px;
}

.msm-fix-grid {
    margin-top: 24px;
}

.msm-web-authority {
    padding: 34px;
    align-items: center;
}

.msm-web-authority-copy .msm-actions { margin-top: 26px; }

.msm-article-preview a {
    display: grid;
    gap: 8px;
    padding: 20px;
}

.msm-article-preview span,
.msm-article-preview small {
    color: var(--msm-gold-soft);
    font-weight: 950;
}

.msm-article-preview strong {
    font-size: 20px;
    line-height: 1.15;
}

.msm-form {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    padding: 22px;
}

.msm-form label {
    display: grid;
    gap: 7px;
    color: var(--msm-text);
    font-weight: 850;
    font-size: 14px;
}

.msm-form input,
.msm-form textarea {
    width: 100%;
    border: 1px solid var(--msm-line);
    border-radius: 14px;
    background: rgba(5, 8, 7, 0.78);
    color: var(--msm-text);
    padding: 14px;
    font: inherit;
    outline: none;
}

.msm-form input:focus,
.msm-form textarea:focus {
    border-color: rgba(243, 207, 115, 0.72);
    box-shadow: 0 0 0 3px rgba(243, 207, 115, 0.12);
}

.msm-form textarea { min-height: 112px; resize: vertical; }
.msm-full { grid-column: 1 / -1; }

.msm-honeypot {
    position: absolute;
    left: -10000px;
    width: 1px;
    height: 1px;
    overflow: hidden;
}

.msm-form-note,
.msm-form-error {
    border-radius: 14px;
    padding: 14px;
    line-height: 1.45;
}

.msm-form-note {
    border: 1px solid rgba(243, 207, 115, 0.28);
    background: rgba(243, 207, 115, 0.08);
    color: var(--msm-muted);
}

.msm-form-note strong {
    color: var(--msm-text);
    margin-right: 4px;
}

.msm-form-note a {
    color: var(--msm-gold);
    font-weight: 850;
}

.msm-form-error {
    border: 1px solid rgba(255, 122, 122, 0.44);
    background: rgba(255, 122, 122, 0.1);
    color: #ffd6d6;
    font-weight: 800;
}

.msm-form-success {
    border: 1px solid rgba(83, 164, 135, 0.44);
    border-radius: 16px;
    background: rgba(83, 164, 135, 0.1);
    padding: 16px;
}

.msm-form-success p {
    margin-top: 6px;
    color: var(--msm-muted);
}

.msm-footer {
    max-width: 1180px;
    margin: 0 auto;
    padding: 40px 22px 70px;
    border-top: 1px solid var(--msm-line);
}

.msm-footer strong { font-size: 24px; }
.msm-footer p { color: var(--msm-muted); margin-top: 6px; }

@media (max-width: 980px) {
    .msm-nav {
        grid-template-columns: 1fr auto;
    }

    .msm-nav-links { display: none; }

    .msm-hero,
    .msm-two-col,
    .msm-audit-section,
    .msm-proof-panel,
    .msm-web-authority {
        grid-template-columns: 1fr;
    }

    .msm-hero { min-height: auto; }
    .msm-services-grid,
    .msm-process-grid { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 640px) {
    .msm-section { padding: 64px 18px; }
    .msm-nav { padding: 14px 18px; gap: 12px; }
    .msm-brand span:last-child { font-size: 14px; }
    .msm-logo { width: 38px; height: 38px; }
    .msm-nav-cta { min-height: 38px; padding: 9px 12px; font-size: 12px; }
    .msm-hero { padding-top: 58px; }
    .msm-hero-copy h1 { font-size: clamp(42px, 13vw, 58px); letter-spacing: 0; }

    .msm-card-grid,
    .msm-services-grid,
    .msm-process-grid,
    .msm-before-after,
    .msm-article-preview,
    .msm-form,
    .msm-metrics {
        grid-template-columns: 1fr;
    }

    .msm-actions,
    .msm-button,
    .msm-footer {
        width: 100%;
    }

    .msm-footer { flex-direction: column; align-items: flex-start; }
}
`
