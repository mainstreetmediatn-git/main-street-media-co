import * as React from "react"
import { getWebAuthorityArticle, webAuthorityArticles, type WebAuthorityArticle } from "./data/webAuthorityArticles"

const auditHref = "/#audit-form"
const hubHref = "/web-authority"
const articlesHref = "/web-authority/articles"
const calendlyHref = "https://calendly.com/mainstreetmediatn/30min"

export function WebAuthorityRoute({ path }: { path: string }) {
    const slug = path.replace(/^\/web-authority\/?/, "").replace(/^articles\/?/, "")

    if (path === "/web-authority" || path === "/web-authority/") {
        return <WebAuthorityLanding />
    }

    if (path === "/web-authority/articles" || path === "/web-authority/articles/") {
        return <WebAuthorityArticleIndex />
    }

    const article = getWebAuthorityArticle(slug)
    return article ? <WebAuthorityArticlePage article={article} /> : <WebAuthorityNotFound />
}

function Seo({ title, description, path = "/web-authority" }: { title: string; description: string; path?: string }) {
    React.useEffect(() => {
        const canonicalUrl = `https://mainstreetmediaco.com${path}`
        const image = "https://mainstreetmediaco.com/og-image.jpg"

        document.title = title
        setMeta("name", "description", description)
        setMeta("property", "og:title", title)
        setMeta("property", "og:description", description)
        setMeta("property", "og:type", "article")
        setMeta("property", "og:url", canonicalUrl)
        setMeta("property", "og:image", image)
        setMeta("name", "twitter:card", "summary_large_image")
        setMeta("name", "twitter:title", title)
        setMeta("name", "twitter:description", description)
        setMeta("name", "twitter:image", image)
        setCanonical(canonicalUrl)
    }, [description, path, title])

    return null
}

function WebAuthorityLayout({ children }: { children: React.ReactNode }) {
    return (
        <main className="wa-page">
            <style>{webAuthorityCss}</style>
            <header className="wa-header">
                <nav className="wa-nav" aria-label="WebAuthority navigation">
                    <a className="wa-brand" href="/">
                        <span className="wa-logo">MS</span>
                        <span>Main Street Media Co.</span>
                    </a>
                    <div className="wa-nav-links">
                        <a href={hubHref}>WebAuthority</a>
                        <a href={articlesHref}>Articles</a>
                        <a href={auditHref}>Visibility Audit</a>
                    </div>
                    <a className="wa-nav-cta" href={calendlyHref} target="_blank" rel="noreferrer">Book Free Audit Call</a>
                </nav>
            </header>
            {children}
            <footer className="wa-footer">
                <div>
                    <strong>Main Street Media Co.</strong>
                    <p>Helping Great Local Businesses Become Impossible to Ignore.</p>
                </div>
                <div className="wa-footer-actions">
                    <a className="wa-button wa-button-secondary" href={hubHref}>Back to WebAuthority</a>
                    <a className="wa-button wa-button-secondary" href={calendlyHref} target="_blank" rel="noreferrer">Book Free Audit Call</a>
                </div>
            </footer>
        </main>
    )
}

export function WebAuthorityLanding() {
    const featured = webAuthorityArticles.slice(0, 6)
    const industries = ["Roofing", "HVAC", "Plumbing", "Landscaping", "Restoration", "Remodeling", "Cleaning", "Pest Control"]

    return (
        <WebAuthorityLayout>
            <Seo
                title="WebAuthority | Main Street Media Co."
                description="WebAuthority is Main Street Media Co.'s authority-content and local SEO education hub for service businesses."
                path="/web-authority"
            />
            <section className="wa-hero wa-section">
                <div>
                    <p className="wa-kicker">WebAuthority</p>
                    <h1>Local SEO education for service businesses that need to be found, trusted, and contacted.</h1>
                    <p className="wa-lede">
                        WebAuthority teaches local service businesses how to improve Google visibility, earn trust faster, and convert more searchers into calls, quote requests, and booked jobs.
                    </p>
                    <div className="wa-actions">
                        <a className="wa-button wa-button-primary" href={auditHref}>Request Free Visibility Audit</a>
                        <a className="wa-button wa-button-secondary" href={calendlyHref} target="_blank" rel="noreferrer">Book Free Audit Call</a>
                        <a className="wa-button wa-button-secondary" href={articlesHref}>Browse Articles</a>
                    </div>
                </div>
                <aside className="wa-snapshot">
                    <span className="wa-panel-label">Website Authority Snapshot</span>
                    <div className="wa-score-row">
                        <strong>4</strong>
                        <span>systems local buyers check before they call</span>
                    </div>
                    <div className="wa-mini-grid">
                        <span>Findability</span>
                        <span>Trust</span>
                        <span>Reputation</span>
                        <span>Conversion</span>
                    </div>
                </aside>
            </section>

            <section className="wa-section wa-two-col">
                <div>
                    <p className="wa-eyebrow">What WebAuthority Means</p>
                    <h2>Authority is what makes a local business look like the obvious choice before the first call.</h2>
                </div>
                <p>
                    It is built through clear service pages, accurate local signals, useful education, visible proof, strong reviews, and a frictionless path to request help. WebAuthority gives owners a practical framework for improving those assets without chasing gimmicks.
                </p>
            </section>

            <section className="wa-section">
                <div className="wa-section-head">
                    <p className="wa-eyebrow">Local Visibility Gap</p>
                    <h2>Most local companies do not have a traffic problem first. They have a clarity and trust problem.</h2>
                </div>
                <div className="wa-card-grid">
                    {["Google cannot clearly connect services to locations.", "Buyers do not see enough proof before comparing competitors.", "The website explains the company but does not guide the next action.", "Reviews and reputation assets are not supporting the sale."].map((item) => (
                        <article className="wa-card" key={item}><p>{item}</p></article>
                    ))}
                </div>
            </section>

            <section className="wa-section">
                <div className="wa-section-head">
                    <p className="wa-eyebrow">WebAuthority Framework</p>
                    <h2>A practical path from search visibility to booked local work.</h2>
                </div>
                <div className="wa-framework">
                    {["Be found for the right services", "Prove local credibility quickly", "Answer buyer questions in plain English", "Make calls and quote requests obvious"].map((item, index) => (
                        <article className="wa-step" key={item}>
                            <span>0{index + 1}</span>
                            <h3>{item}</h3>
                        </article>
                    ))}
                </div>
            </section>

            <section className="wa-section">
                <div className="wa-section-head wa-split-head">
                    <div>
                        <p className="wa-eyebrow">Featured Articles</p>
                        <h2>Start with the issues that most often block local calls.</h2>
                    </div>
                    <a className="wa-text-link" href={articlesHref}>View all articles</a>
                </div>
                <ArticleGrid articles={featured} />
            </section>

            <section className="wa-section wa-industries">
                <div>
                    <p className="wa-eyebrow">Industries Served</p>
                    <h2>Built for service businesses where local timing, trust, and reputation decide the sale.</h2>
                </div>
                <div className="wa-chip-grid">{industries.map((industry) => <span key={industry}>{industry}</span>)}</div>
            </section>

            <WebAuthorityCTA />
        </WebAuthorityLayout>
    )
}

export function WebAuthorityArticleIndex() {
    const categories = Array.from(new Set(webAuthorityArticles.map((article) => article.category)))
    const featured = webAuthorityArticles[0]

    return (
        <WebAuthorityLayout>
            <Seo
                title="WebAuthority Articles | Main Street Media Co."
                description="Browse WebAuthority articles on local SEO, Google Business Profile optimization, reputation, website authority, and conversion."
                path="/web-authority/articles"
            />
            <section className="wa-section wa-index-hero">
                <p className="wa-kicker">WebAuthority Articles</p>
                <h1>Practical local visibility guides for service business owners.</h1>
                <p className="wa-lede">Use these guides to improve search visibility, trust, and conversion before spending more on traffic.</p>
            </section>
            <section className="wa-section wa-tight-section">
                <div className="wa-chip-grid">{categories.map((category) => <span key={category}>{category}</span>)}</div>
            </section>
            <section className="wa-section wa-featured-row">
                <div>
                    <p className="wa-eyebrow">Featured Article</p>
                    <h2>{featured.title}</h2>
                    <p>{featured.excerpt}</p>
                </div>
                <a className="wa-button wa-button-primary" href={`/web-authority/${featured.slug}`}>Read Featured Article</a>
            </section>
            <section className="wa-section wa-tight-section">
                <ArticleGrid articles={webAuthorityArticles} />
            </section>
            <WebAuthorityCTA />
        </WebAuthorityLayout>
    )
}

export function WebAuthorityArticlePage({ article }: { article: WebAuthorityArticle }) {
    const related = webAuthorityArticles.filter((item) => item.slug !== article.slug && item.category === article.category).slice(0, 3)
    const fallbackRelated = related.length > 0 ? related : webAuthorityArticles.filter((item) => item.slug !== article.slug).slice(0, 3)

    return (
        <WebAuthorityLayout>
            <Seo title={article.seoTitle} description={article.metaDescription} path={`/web-authority/${article.slug}`} />
            <article className="wa-article">
                <header className="wa-section wa-article-hero">
                    <a className="wa-text-link" href={articlesHref}>Articles</a>
                    <p className="wa-kicker">{article.category}</p>
                    <h1>{article.title}</h1>
                    <p className="wa-lede">{article.excerpt}</p>
                    <div className="wa-article-meta">
                        <span>{article.readTime}</span>
                        <span>Primary keyword: {article.primaryKeyword}</span>
                    </div>
                    <div className="wa-meta-card">
                        <strong>SEO title</strong>
                        <p>{article.seoTitle}</p>
                        <strong>Meta description</strong>
                        <p>{article.metaDescription}</p>
                    </div>
                </header>

                <div className="wa-section wa-article-layout">
                    <aside className="wa-toc">
                        <strong>Table of contents</strong>
                        {article.sections.map((section) => (
                            <a key={section.heading} href={`#${toId(section.heading)}`}>{section.heading}</a>
                        ))}
                    </aside>
                    <div className="wa-article-body">
                        {article.sections.map((section) => (
                            <section id={toId(section.heading)} key={section.heading}>
                                <h2>{section.heading}</h2>
                                <p>{section.body}</p>
                            </section>
                        ))}
                        <section className="wa-checklist">
                            <h2>Practical checklist</h2>
                            <ul>
                                <li>Confirm the page clearly names the service, location, and customer problem.</li>
                                <li>Place reviews, proof, credentials, or project examples near the main call to action.</li>
                                <li>Make the phone number and quote request path visible on mobile.</li>
                                <li>Connect the page to related services, service areas, and Google Business Profile signals.</li>
                                <li>Measure calls and qualified form submissions, not only visits.</li>
                            </ul>
                        </section>
                        <section>
                            <h2>Related WebAuthority articles</h2>
                            <div className="wa-related-links">
                                {fallbackRelated.map((item) => (
                                    <a key={item.slug} href={`/web-authority/${item.slug}`}>{item.title}</a>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>
            </article>
            <WebAuthorityCTA />
            <section className="wa-section wa-tight-section">
                <a className="wa-text-link" href={articlesHref}>Back to WebAuthority article index</a>
            </section>
        </WebAuthorityLayout>
    )
}

function WebAuthorityCTA() {
    return (
        <section className="wa-section wa-cta">
            <div>
                <p className="wa-eyebrow">Free Visibility Audit</p>
                <h2>Find the visibility, trust, and conversion gaps costing you local calls.</h2>
                <p>Request a practical review of your website, Google Business Profile, local search presence, and lead path.</p>
            </div>
            <div className="wa-cta-actions">
                <a className="wa-button wa-button-primary" href={auditHref}>Request Free Visibility Audit</a>
                <a className="wa-button wa-button-secondary" href={calendlyHref} target="_blank" rel="noreferrer">Book Free Audit Call</a>
            </div>
        </section>
    )
}

function ArticleGrid({ articles }: { articles: WebAuthorityArticle[] }) {
    return (
        <div className="wa-article-grid">
            {articles.map((article) => (
                <a className="wa-article-card" href={`/web-authority/${article.slug}`} key={article.slug}>
                    <span>{article.category}</span>
                    <h3>{article.title}</h3>
                    <p>{article.excerpt}</p>
                    <small>{article.readTime}</small>
                </a>
            ))}
        </div>
    )
}

function WebAuthorityNotFound() {
    return (
        <WebAuthorityLayout>
            <Seo title="WebAuthority Article Not Found | Main Street Media Co." description="The requested WebAuthority article could not be found." path="/web-authority/articles" />
            <section className="wa-section wa-index-hero">
                <p className="wa-kicker">WebAuthority</p>
                <h1>Article not found.</h1>
                <p className="wa-lede">The article may have moved. Browse the full WebAuthority index for current local visibility guides.</p>
                <div className="wa-actions">
                    <a className="wa-button wa-button-primary" href={articlesHref}>Browse Articles</a>
                    <a className="wa-button wa-button-secondary" href={hubHref}>Back to WebAuthority</a>
                </div>
            </section>
        </WebAuthorityLayout>
    )
}

function toId(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
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

const webAuthorityCss = `
:root {
    --wa-bg: #050807;
    --wa-bg-soft: #0c1512;
    --wa-panel: rgba(255, 255, 255, 0.075);
    --wa-panel-strong: rgba(255, 255, 255, 0.12);
    --wa-line: rgba(255, 255, 255, 0.14);
    --wa-text: #f8f4ea;
    --wa-muted: rgba(248, 244, 234, 0.72);
    --wa-gold: #d7a642;
    --wa-gold-soft: #f3cf73;
    --wa-teal: #53a487;
    --wa-ink: #07100d;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
.wa-page {
    min-height: 100vh;
    background:
        radial-gradient(circle at 18% 2%, rgba(215, 166, 66, 0.25), transparent 31rem),
        radial-gradient(circle at 88% 12%, rgba(83, 164, 135, 0.22), transparent 29rem),
        linear-gradient(180deg, #050807 0%, #0a1210 52%, #11100c 100%);
    color: var(--wa-text);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    line-height: 1.5;
}
.wa-page a { color: inherit; text-decoration: none; }
.wa-page h1, .wa-page h2, .wa-page h3, .wa-page p { margin: 0; }
.wa-header {
    position: sticky;
    top: 0;
    z-index: 10;
    background: rgba(5, 8, 7, 0.78);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(18px);
}
.wa-nav {
    max-width: 1180px;
    margin: 0 auto;
    padding: 16px 22px;
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 22px;
}
.wa-brand, .wa-actions, .wa-nav-links, .wa-chip-grid, .wa-related-links, .wa-cta-actions, .wa-footer-actions { display: flex; align-items: center; }
.wa-brand { gap: 12px; font-weight: 950; }
.wa-logo {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    background: linear-gradient(135deg, var(--wa-gold-soft), var(--wa-teal));
    color: var(--wa-ink);
    font-weight: 950;
}
.wa-nav-links { justify-content: center; gap: 24px; color: var(--wa-muted); font-size: 14px; font-weight: 850; }
.wa-nav-links a:hover, .wa-text-link:hover { color: var(--wa-gold-soft); }
.wa-nav-cta {
    min-height: 42px;
    padding: 10px 16px;
    border: 1px solid rgba(243, 207, 115, 0.45);
    border-radius: 999px;
    color: var(--wa-gold-soft);
    background: rgba(243, 207, 115, 0.08);
    font-weight: 950;
    font-size: 14px;
    text-align: center;
}
.wa-section { max-width: 1180px; margin: 0 auto; padding: 82px 22px; }
.wa-tight-section { padding-top: 24px; padding-bottom: 36px; }
.wa-hero {
    min-height: calc(100vh - 75px);
    display: grid;
    grid-template-columns: minmax(0, 1.08fr) minmax(320px, 0.92fr);
    gap: 44px;
    align-items: center;
}
.wa-index-hero { padding-bottom: 36px; }
.wa-kicker, .wa-eyebrow {
    color: var(--wa-gold-soft);
    font-weight: 950;
    text-transform: uppercase;
    font-size: 12px;
    letter-spacing: 0.12em;
}
.wa-hero h1, .wa-index-hero h1, .wa-article-hero h1 {
    max-width: 900px;
    margin-top: 16px;
    font-size: clamp(44px, 7vw, 82px);
    line-height: 0.98;
    letter-spacing: 0;
}
.wa-section-head h2, .wa-two-col h2, .wa-cta h2, .wa-featured-row h2, .wa-industries h2 {
    margin-top: 12px;
    max-width: 850px;
    font-size: clamp(32px, 4vw, 56px);
    line-height: 1;
    letter-spacing: 0;
}
.wa-lede {
    max-width: 720px;
    margin-top: 24px;
    color: var(--wa-muted);
    font-size: clamp(18px, 2vw, 22px);
}
.wa-actions { flex-wrap: wrap; gap: 14px; margin-top: 32px; }
.wa-button {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    min-height: 52px;
    padding: 14px 20px;
    border-radius: 999px;
    border: 1px solid transparent;
    font-weight: 950;
}
.wa-button-primary {
    background: linear-gradient(135deg, var(--wa-gold-soft), var(--wa-gold));
    color: var(--wa-ink);
    box-shadow: 0 24px 70px rgba(215, 166, 66, 0.22);
}
.wa-button-secondary {
    background: rgba(255, 255, 255, 0.07);
    color: var(--wa-text);
    border-color: var(--wa-line);
}
.wa-snapshot, .wa-card, .wa-step, .wa-article-card, .wa-featured-row, .wa-cta, .wa-meta-card, .wa-toc, .wa-checklist {
    border: 1px solid var(--wa-line);
    background: linear-gradient(180deg, var(--wa-panel-strong), var(--wa-panel));
    border-radius: 22px;
    box-shadow: 0 30px 90px rgba(0, 0, 0, 0.28);
    backdrop-filter: blur(14px);
}
.wa-snapshot { padding: 26px; }
.wa-panel-label, .wa-article-card span, .wa-article-card small { color: var(--wa-gold-soft); font-weight: 950; }
.wa-score-row {
    margin-top: 28px;
    padding: 32px;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.055);
    display: grid;
    gap: 8px;
    text-align: center;
}
.wa-score-row strong { font-size: 92px; line-height: 1; color: var(--wa-gold-soft); }
.wa-score-row span, .wa-section p, .wa-featured-row p, .wa-cta p, .wa-article-body p, .wa-meta-card p { color: var(--wa-muted); }
.wa-mini-grid, .wa-card-grid, .wa-framework, .wa-article-grid {
    display: grid;
    gap: 16px;
}
.wa-mini-grid { grid-template-columns: 1fr 1fr; margin-top: 18px; }
.wa-mini-grid span, .wa-chip-grid span {
    border: 1px solid var(--wa-line);
    background: rgba(255, 255, 255, 0.055);
    border-radius: 999px;
    padding: 10px 14px;
    color: var(--wa-muted);
    font-weight: 850;
}
.wa-two-col, .wa-industries, .wa-cta, .wa-featured-row {
    display: grid;
    grid-template-columns: 0.9fr 1.1fr;
    gap: 34px;
    align-items: center;
}
.wa-card-grid { grid-template-columns: repeat(4, 1fr); margin-top: 28px; }
.wa-card, .wa-step, .wa-article-card { padding: 22px; }
.wa-framework { grid-template-columns: repeat(4, 1fr); margin-top: 28px; }
.wa-step span { color: var(--wa-gold-soft); font-weight: 950; display: block; margin-bottom: 18px; }
.wa-step h3, .wa-article-card h3 { font-size: 21px; line-height: 1.14; }
.wa-split-head {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    align-items: end;
}
.wa-text-link { color: var(--wa-gold-soft); font-weight: 950; }
.wa-article-grid { grid-template-columns: repeat(3, 1fr); margin-top: 28px; }
.wa-article-card { display: grid; gap: 14px; min-height: 260px; }
.wa-article-card p { color: var(--wa-muted); }
.wa-chip-grid { flex-wrap: wrap; gap: 12px; }
.wa-featured-row, .wa-cta { padding: 34px; }
.wa-featured-row .wa-button, .wa-cta .wa-button { justify-self: end; }
.wa-cta-actions, .wa-footer-actions { justify-content: flex-end; gap: 12px; flex-wrap: wrap; }
.wa-cta-actions { justify-self: end; }
.wa-article-meta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 24px; }
.wa-article-meta span {
    border: 1px solid var(--wa-line);
    background: rgba(255, 255, 255, 0.055);
    border-radius: 999px;
    padding: 10px 14px;
    color: var(--wa-muted);
    font-weight: 850;
}
.wa-meta-card { margin-top: 26px; padding: 22px; max-width: 820px; display: grid; gap: 8px; }
.wa-meta-card strong { color: var(--wa-gold-soft); }
.wa-article-layout { display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 36px; align-items: start; padding-top: 20px; }
.wa-toc { position: sticky; top: 98px; padding: 20px; display: grid; gap: 12px; }
.wa-toc a { color: var(--wa-muted); font-weight: 800; }
.wa-article-body { max-width: 820px; display: grid; gap: 36px; }
.wa-article-body h2 { font-size: clamp(28px, 3vw, 40px); line-height: 1.05; letter-spacing: 0; margin-bottom: 12px; }
.wa-checklist { padding: 24px; }
.wa-checklist ul { margin: 14px 0 0; padding-left: 22px; color: var(--wa-muted); }
.wa-checklist li + li { margin-top: 10px; }
.wa-related-links { align-items: stretch; flex-direction: column; gap: 10px; }
.wa-related-links a {
    border: 1px solid var(--wa-line);
    background: rgba(255, 255, 255, 0.055);
    border-radius: 14px;
    padding: 14px;
    font-weight: 900;
}
.wa-footer {
    max-width: 1180px;
    margin: 0 auto;
    padding: 40px 22px 70px;
    border-top: 1px solid var(--wa-line);
    display: flex;
    justify-content: space-between;
    gap: 18px;
    align-items: center;
}
.wa-footer strong { font-size: 24px; }
.wa-footer p { color: var(--wa-muted); margin-top: 6px; }
@media (max-width: 980px) {
    .wa-nav { grid-template-columns: 1fr auto; }
    .wa-nav-links { display: none; }
    .wa-hero, .wa-two-col, .wa-industries, .wa-cta, .wa-featured-row, .wa-article-layout { grid-template-columns: 1fr; }
    .wa-hero { min-height: auto; }
    .wa-card-grid, .wa-framework, .wa-article-grid { grid-template-columns: 1fr 1fr; }
    .wa-featured-row .wa-button, .wa-cta .wa-button, .wa-cta-actions { justify-self: start; }
    .wa-toc { position: static; }
}
@media (max-width: 640px) {
    .wa-section { padding: 62px 18px; }
    .wa-tight-section { padding-top: 18px; padding-bottom: 28px; }
    .wa-nav { padding: 14px 18px; gap: 12px; }
    .wa-logo { width: 38px; height: 38px; }
    .wa-brand span:last-child { font-size: 14px; }
    .wa-nav-cta { min-height: 38px; padding: 9px 12px; font-size: 12px; }
    .wa-hero h1, .wa-index-hero h1, .wa-article-hero h1 { font-size: clamp(40px, 12vw, 58px); }
    .wa-card-grid, .wa-framework, .wa-article-grid, .wa-mini-grid { grid-template-columns: 1fr; }
    .wa-button, .wa-footer, .wa-cta-actions, .wa-footer-actions { width: 100%; }
    .wa-footer { flex-direction: column; align-items: flex-start; }
    .wa-cta-actions, .wa-footer-actions { flex-direction: column; align-items: stretch; }
}
`
