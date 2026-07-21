import { FormEvent, useMemo, useState } from "react"
import { WebAuthorityRoute } from "./WebAuthority"

type IntegrationMode = "LIVE" | "SANDBOX" | "MOCK" | "DISABLED" | "NOT_CONFIGURED"

type AuditResponse = {
  ok?: boolean
  mode?: IntegrationMode
  message?: string
  referenceId?: string
  errors?: string[]
}

const portalUrl = import.meta.env.VITE_PORTAL_URL || "https://dashboard-two-beige-24.vercel.app"
const calendlyUrl = import.meta.env.VITE_CALENDLY_URL || ""

const stages = [
  {
    name: "Reveal",
    label: "Visibility Audit",
    copy: "Expose weak search signals, conversion leaks, review gaps, and abandoned lead paths before spend increases.",
  },
  {
    name: "Evolve",
    label: "Infrastructure Rebuild",
    copy: "Install faster pages, sharper offers, CRM wiring, AI response flows, and measurable booking paths.",
  },
  {
    name: "Ascend",
    label: "Growth Operations",
    copy: "Operate monthly reporting, review acceleration, uptime checks, search profile tuning, and pipeline optimization.",
  },
]

const industries = [
  { name: "HVAC / Plumbing", speed: 71, reviews: 44, profile: 68, missed: "$84,000" },
  { name: "Legal / Professional Services", speed: 63, reviews: 58, profile: 74, missed: "$126,000" },
  { name: "Dental / Medical", speed: 78, reviews: 61, profile: 81, missed: "$92,000" },
  { name: "Local Retail", speed: 69, reviews: 39, profile: 66, missed: "$48,000" },
]

const navItems = [
  ["Home", "/"],
  ["Audit", "/audit"],
  ["Services", "/services"],
  ["Evolve", "/evolve"],
  ["Ascend", "/ascend"],
  ["Demo", "/demo"],
  ["Results", "/results"],
  ["About", "/about"],
  ["Contact", "/contact"],
  ["Portal", "/portal"],
]

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Main Street Media home">
          <span className="brand-mark">MSM</span>
          <span>Main Street Media</span>
        </a>
        <nav className="nav" aria-label="Primary navigation">
          {navItems.map(([label, href]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </nav>
      </header>
      {children}
      <footer className="footer">
        <span>Main Street Media digital headquarters</span>
        <span>Reveal {">"} Evolve {">"} Ascend</span>
      </footer>
    </div>
  )
}

function TelemetryBar() {
  return (
    <section className="telemetry-bar" aria-label="Operating telemetry">
      {[
        ["Audit Engine", "OPERATIONAL"],
        ["Active Pipelines", "18"],
        ["Follow-ups Processed", "12,840"],
        ["Dispatch Mode", "LIVE/SANDBOX AWARE"],
      ].map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </section>
  )
}

function HomePage() {
  return (
    <AppShell>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Noir Obsidian operator platform</p>
            <h1>Digital Infrastructure & Autonomous Growth for Local Enterprise.</h1>
            <p className="lede">
              We audit weak online signals, install high-converting digital infrastructure, and automate lead-to-sale
              pipelines.
            </p>
            <div className="actions">
              <a className="button primary" href="/audit">
                Run Visibility Audit
              </a>
              <a className="button ghost" href="/demo">
                Launch Live Demo
              </a>
            </div>
          </div>
          <div className="operator-panel" aria-label="System telemetry preview">
            <div className="panel-head">
              <span className="live-dot" />
              <span>GROWTH OPS CONSOLE</span>
            </div>
            <div className="score-ring">94</div>
            <div className="metric-grid">
              <span>Lead capture</span>
              <strong>+38%</strong>
              <span>Review velocity</span>
              <strong>2.7x</strong>
              <span>Response latency</span>
              <strong>0:42</strong>
            </div>
          </div>
        </section>
        <TelemetryBar />
        <Pipeline />
        <Comparison />
      </main>
    </AppShell>
  )
}

function Pipeline() {
  return (
    <section className="section">
      <div className="section-heading">
        <p className="eyebrow">Transformation sequence</p>
        <h2>Reveal {">"} Evolve {">"} Ascend</h2>
      </div>
      <div className="stage-grid">
        {stages.map((stage, index) => (
          <article className="glass-card" key={stage.name}>
            <span className="step">0{index + 1}</span>
            <h3>{stage.name}</h3>
            <p className="muted">{stage.label}</p>
            <p>{stage.copy}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function Comparison() {
  return (
    <section className="comparison">
      <div>
        <p className="eyebrow danger">Current drag</p>
        <h2>Fragmented local presence</h2>
        <ul>
          <li>Missed calls and slow response loops</li>
          <li>Weak Google Business Profile signals</li>
          <li>Forms that do not reliably dispatch</li>
          <li>No review or reactivation automation</li>
        </ul>
      </div>
      <div>
        <p className="eyebrow">Installed system</p>
        <h2>Unified growth infrastructure</h2>
        <ul>
          <li>Instant booking and lead intake paths</li>
          <li>CRM, email, and webhook adapter checks</li>
          <li>AI-assisted response and follow-up flows</li>
          <li>Monthly operator reporting and optimization</li>
        </ul>
      </div>
    </section>
  )
}

function AuditPage() {
  const [status, setStatus] = useState<AuditResponse | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submitAudit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setStatus(null)

    const form = new FormData(event.currentTarget)
    const payload = Object.fromEntries(form.entries())

    try {
      const response = await fetch("/api/lead-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = (await response.json()) as AuditResponse
      setStatus(data)
    } catch {
      setStatus({ ok: false, mode: "DISABLED", message: "Network dispatch failed before the request reached the server." })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell>
      <main className="page-grid">
        <section>
          <p className="eyebrow">Reveal</p>
          <h1>Visibility Audit Intake</h1>
          <p className="lede">
            Submit the signal set needed to inspect search presence, conversion friction, and follow-up gaps.
          </p>
          <div className="integration-note">
            Server dispatch reports its real mode: LIVE when a CRM webhook is configured, SANDBOX when stored/logged
            without external delivery.
          </div>
        </section>
        <form className="audit-form" onSubmit={submitAudit}>
          {[
            ["businessName", "Business Name"],
            ["category", "Category"],
            ["website", "Website URL"],
            ["googleMaps", "Google Maps Link"],
            ["location", "Location"],
            ["contactName", "Contact Person"],
            ["email", "Email"],
            ["phone", "Phone"],
          ].map(([name, label]) => (
            <label key={name}>
              <span>{label}</span>
              <input name={name} required={["businessName", "category", "contactName"].includes(name)} />
            </label>
          ))}
          <label className="wide">
            <span>Primary Growth Bottleneck</span>
            <textarea name="bottleneck" required rows={4} />
          </label>
          <button className="button primary wide" disabled={submitting}>
            {submitting ? "Dispatching..." : "Submit Audit Request"}
          </button>
          {status && (
            <div className={`status ${status.ok ? "ok" : "error"}`} role="status">
              <strong>{status.mode ?? "UNKNOWN"}</strong>
              <span>{status.message ?? (status.ok ? "Audit request accepted." : "Audit request failed.")}</span>
              {status.referenceId && <small>Reference: {status.referenceId}</small>}
              {status.errors?.map((error) => (
                <small key={error}>{error}</small>
              ))}
            </div>
          )}
        </form>
      </main>
    </AppShell>
  )
}

function DemoPage() {
  const [selected, setSelected] = useState(industries[0].name)
  const profile = useMemo(() => industries.find((item) => item.name === selected) ?? industries[0], [selected])
  const total = Math.round((profile.speed + profile.reviews + profile.profile) / 3)

  return (
    <AppShell>
      <main className="page-grid">
        <section>
          <p className="eyebrow">Safe demo</p>
          <h1>Interactive Product Telemetry</h1>
          <p className="lede">Demonstration Scenario - Illustrative Diagnostic Model.</p>
          <div className="segmented">
            {industries.map((industry) => (
              <button key={industry.name} onClick={() => setSelected(industry.name)} className={selected === industry.name ? "active" : ""}>
                {industry.name}
              </button>
            ))}
          </div>
        </section>
        <section className="score-card">
          <p className="eyebrow">Reveal score card</p>
          <div className="score-ring">{total}</div>
          <Metric label="Google Business Profile Completeness" value={profile.profile} />
          <Metric label="Mobile Speed & CTA Health" value={profile.speed} />
          <Metric label="Review Acceleration Gap" value={profile.reviews} />
          <div className="missed">
            <span>Estimated annual missed revenue</span>
            <strong>{profile.missed}</strong>
          </div>
        </section>
      </main>
    </AppShell>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}%</strong>
      <div>
        <i style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function ServicesPage() {
  return <ContentPage title="Capabilities & Outcomes" eyebrow="Services" items={["Authority-focused websites", "Local SEO and Google profile optimization", "Lead capture and CRM integration", "AI response and review automation", "Performance reporting and conversion analytics"]} />
}

function EvolvePage() {
  return <ContentPage title="Implementation & AI Automation Systems" eyebrow="Evolve" items={["Discovery", "Architecture", "Rebuild", "Lead-Capture Wiring", "CRM Integration", "AI Agent Deployment", "Testing", "Launch"]} />
}

function AscendPage() {
  return <ContentPage title="Optimization & Platform Support" eyebrow="Ascend" items={["Monthly maintenance", "Uptime monitoring", "Search profile optimization", "Automated review generation", "Strategic reporting", "Pipeline experiments"]} />
}

function ResultsPage() {
  return <ContentPage title="Verified Case Studies & Illustrative Scenarios" eyebrow="Results" items={["Booked-call path rebuilds", "Review velocity improvements", "Lead response time compression", "Visibility score recovery", "Demo models clearly labeled when illustrative"]} />
}

function AboutPage() {
  return <ContentPage title="Mission, Focus, & Operating Model" eyebrow="About" items={["Built for local enterprise operators", "Measured by captured demand and booked conversations", "Transparent integration modes", "No fake automation claims", "Production-first delivery discipline"]} />
}

function ContactPage() {
  return (
    <AppShell>
      <main className="page-grid">
        <section>
          <p className="eyebrow">Direct channel</p>
          <h1>Strategy Call Scheduling</h1>
          <p className="lede">Use scheduling when configured, or route through the audit intake fallback.</p>
          <div className="actions">
            {calendlyUrl ? <a className="button primary" href={calendlyUrl}>Schedule Strategy Call</a> : <a className="button primary" href="/audit">Request Audit</a>}
            <a className="button ghost" href="mailto:hello@mainstreetmediaco.com">Email Directly</a>
          </div>
        </section>
      </main>
    </AppShell>
  )
}

function PortalPage() {
  return (
    <AppShell>
      <main className="portal-gate">
        <p className="eyebrow">Client portal</p>
        <h1>Operator Login</h1>
        <p className="lede">Existing clients continue through the secure dashboard environment.</p>
        <a className="button primary" href={portalUrl}>Continue to Dashboard</a>
      </main>
    </AppShell>
  )
}

function LegalPage() {
  return <ContentPage title="Privacy, Terms, Accessibility" eyebrow="Legal" items={["Privacy requests: hello@mainstreetmediaco.com", "Terms apply to audit and implementation engagements", "Accessibility issues are reviewed as production defects", "Third-party adapters are governed by their configured providers"]} />
}

function ContentPage({ title, eyebrow, items }: { title: string; eyebrow: string; items: string[] }) {
  return (
    <AppShell>
      <main className="section content-page">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <div className="stage-grid">
          {items.map((item, index) => (
            <article className="glass-card" key={item}>
              <span className="step">0{index + 1}</span>
              <h3>{item}</h3>
            </article>
          ))}
        </div>
      </main>
    </AppShell>
  )
}

export default function App() {
  const path = window.location.pathname

  if (path.startsWith("/web-authority")) return <WebAuthorityRoute path={path} />
  if (path === "/audit") return <AuditPage />
  if (path === "/services") return <ServicesPage />
  if (path === "/evolve") return <EvolvePage />
  if (path === "/ascend") return <AscendPage />
  if (path === "/demo") return <DemoPage />
  if (path === "/results") return <ResultsPage />
  if (path === "/about") return <AboutPage />
  if (path === "/contact") return <ContactPage />
  if (path === "/portal") return <PortalPage />
  if (path === "/legal") return <LegalPage />

  return <HomePage />
}
