export type WebAuthoritySection = {
    heading: string
    body: string
}

export type WebAuthorityArticle = {
    title: string
    slug: string
    seoTitle: string
    metaDescription: string
    category: string
    primaryKeyword: string
    secondaryKeywords: string[]
    excerpt: string
    readTime: string
    status: "starter"
    sections: WebAuthoritySection[]
}

type ArticleSeed = {
    title: string
    slug: string
    primaryKeyword: string
    category: string
    angle: string
    practicalFocus: string
}

const seeds: ArticleSeed[] = [
    {
        title: "Why Local Businesses Get Traffic But No Customers",
        slug: "why-local-businesses-get-traffic-but-no-customers",
        primaryKeyword: "local business website traffic no customers",
        category: "Conversion",
        angle: "traffic without calls usually means the page is attracting attention without answering the buyer's next question",
        practicalFocus: "clarity, proof, offer strength, and the contact path",
    },
    {
        title: "Google Maps Ranking Factors for Local Businesses",
        slug: "google-maps-ranking-factors-local-businesses",
        primaryKeyword: "Google Maps ranking factors",
        category: "Google Business Profile",
        angle: "map visibility depends on relevance, distance, prominence, and how consistently your business proves it serves the searcher's need",
        practicalFocus: "profile completeness, categories, reviews, services, photos, and local landing pages",
    },
    {
        title: "Why Reviews Matter More Than Ever for Local Businesses",
        slug: "why-reviews-matter-local-businesses",
        primaryKeyword: "why reviews matter for local businesses",
        category: "Reputation",
        angle: "reviews reduce risk for buyers who are comparing similar local companies under time pressure",
        practicalFocus: "review quality, recency, placement, response habits, and proof near calls to action",
    },
    {
        title: "How to Double Local Leads Without Doubling Ad Spend",
        slug: "double-local-leads-without-doubling-ad-spend",
        primaryKeyword: "how to get more local leads",
        category: "Lead Generation",
        angle: "many local companies can improve lead volume by fixing conversion leaks before buying more clicks",
        practicalFocus: "service pages, mobile calls, quote forms, trust signals, and follow-up speed",
    },
    {
        title: "Local SEO Myths That Cost Small Businesses Leads",
        slug: "local-seo-myths-small-businesses",
        primaryKeyword: "local SEO myths",
        category: "Local SEO",
        angle: "bad local SEO advice wastes time on shortcuts while competitors build clearer relevance and trust",
        practicalFocus: "content quality, legitimate local signals, Google Business Profile work, and realistic expectations",
    },
    {
        title: "Why Most Marketing Agencies Fail Small Businesses",
        slug: "why-marketing-agencies-fail-small-businesses",
        primaryKeyword: "marketing agencies for small businesses",
        category: "Strategy",
        angle: "small businesses need accountable visibility and conversion work, not generic campaigns detached from revenue paths",
        practicalFocus: "local market fit, offer clarity, reporting, page quality, and lead handling",
    },
    {
        title: "Visibility vs Advertising: What Local Businesses Need First",
        slug: "visibility-vs-advertising",
        primaryKeyword: "visibility vs advertising",
        category: "Strategy",
        angle: "advertising works harder when the business already looks credible and easy to choose",
        practicalFocus: "organic foundations, trust assets, website conversion, and paid traffic readiness",
    },
    {
        title: "The Local Customer Journey: From Google Search to Phone Call",
        slug: "local-customer-journey-search-to-call",
        primaryKeyword: "local customer journey",
        category: "Conversion",
        angle: "local buyers move from search result to review scan to website check to call faster than most websites are designed for",
        practicalFocus: "intent matching, first impressions, proof, mobile UX, and call readiness",
    },
    {
        title: "The Local Marketing Checklist for Service Businesses",
        slug: "local-marketing-checklist-service-businesses",
        primaryKeyword: "local marketing checklist",
        category: "Checklist",
        angle: "a useful local marketing plan starts with the assets that make every channel easier to trust",
        practicalFocus: "Google profile, website, services, reviews, tracking, and follow-up basics",
    },
    {
        title: "Why Most Local Business Websites Do Not Convert",
        slug: "why-local-business-websites-do-not-convert",
        primaryKeyword: "local business website conversion",
        category: "Conversion",
        angle: "most local websites fail because they describe the company without guiding the buyer to a confident next step",
        practicalFocus: "above-the-fold clarity, proof hierarchy, service specificity, and mobile CTA design",
    },
    {
        title: "Local SEO for Landscaping Companies",
        slug: "local-seo-for-landscaping-companies",
        primaryKeyword: "local SEO for landscaping companies",
        category: "Industry SEO",
        angle: "landscaping companies need seasonal service relevance, project proof, and strong service-area signals",
        practicalFocus: "service pages, before-and-after proof, maintenance plans, neighborhoods, and reviews",
    },
    {
        title: "Local SEO for Roofing Companies",
        slug: "local-seo-for-roofing-companies",
        primaryKeyword: "local SEO for roofing companies",
        category: "Industry SEO",
        angle: "roofing buyers need urgent trust, clear service coverage, and proof that the company handles high-stakes projects",
        practicalFocus: "repair and replacement pages, emergency intent, certifications, financing, reviews, and city pages",
    },
    {
        title: "Local SEO for HVAC Companies",
        slug: "local-seo-for-hvac-companies",
        primaryKeyword: "local SEO for HVAC companies",
        category: "Industry SEO",
        angle: "HVAC search demand changes by season, emergency need, and equipment type",
        practicalFocus: "repair pages, installation pages, maintenance offers, service areas, reviews, and fast-call UX",
    },
    {
        title: "Local SEO for Plumbing Companies",
        slug: "local-seo-for-plumbing-companies",
        primaryKeyword: "local SEO for plumbing companies",
        category: "Industry SEO",
        angle: "plumbing SEO must capture urgent searches while also building trust for planned projects",
        practicalFocus: "emergency pages, drain cleaning, water heaters, service areas, reviews, and mobile calls",
    },
    {
        title: "Google Business Profile Optimization for Service Businesses",
        slug: "google-business-profile-optimization-service-businesses",
        primaryKeyword: "Google Business Profile optimization",
        category: "Google Business Profile",
        angle: "a Google Business Profile should make the business easier to understand, trust, and contact",
        practicalFocus: "categories, services, photos, descriptions, reviews, posts, and website alignment",
    },
    {
        title: "Reputation Management for Local Service Businesses",
        slug: "reputation-management-local-service-businesses",
        primaryKeyword: "reputation management for local businesses",
        category: "Reputation",
        angle: "reputation management is an operating habit, not a last-minute response to a bad review",
        practicalFocus: "review requests, response standards, proof placement, issue handling, and team process",
    },
    {
        title: "Website Authority for Local Businesses",
        slug: "website-authority-local-businesses",
        primaryKeyword: "website authority for local businesses",
        category: "Website Authority",
        angle: "authority comes from useful service content, consistent local signals, and proof that buyers can verify",
        practicalFocus: "service depth, internal links, location relevance, expertise signals, and conversion trust",
    },
    {
        title: "How Service Area Pages Help Local Businesses Rank",
        slug: "service-area-pages-local-seo",
        primaryKeyword: "service area pages SEO",
        category: "Local SEO",
        angle: "service area pages work when they explain real local relevance instead of copying the same city template",
        practicalFocus: "unique city context, services offered, proof, internal links, and honest coverage",
    },
    {
        title: "Trust Signals Every Local Business Website Needs",
        slug: "trust-signals-local-business-websites",
        primaryKeyword: "local business trust signals",
        category: "Conversion",
        angle: "trust signals help searchers decide whether contacting the business feels low-risk",
        practicalFocus: "reviews, credentials, photos, guarantees, process clarity, and visible contact options",
    },
    {
        title: "What a Free Visibility Audit Should Actually Show You",
        slug: "free-visibility-audit-checklist",
        primaryKeyword: "free visibility audit",
        category: "Audit",
        angle: "a useful audit should identify practical visibility, trust, and conversion issues instead of vague marketing opinions",
        practicalFocus: "search presence, website clarity, Google profile, reviews, lead paths, and next actions",
    },
]

function buildSections(seed: ArticleSeed): WebAuthoritySection[] {
    return [
        {
            heading: "What is really happening",
            body: `${seed.title} starts with a simple reality: ${seed.angle}. For a local service business, the goal is not attention for its own sake. The goal is to help a nearby buyer understand that you solve the problem, serve their area, and are worth contacting now.`,
        },
        {
            heading: "Why local buyers hesitate",
            body: `Most searchers compare several companies quickly. They look for proof, service fit, location fit, reviews, and a clear next step. If those signals are missing or scattered, the buyer may keep searching even if your business is capable of doing the job well.`,
        },
        {
            heading: "What to fix first",
            body: `Start with ${seed.practicalFocus}. These assets influence both search visibility and buyer confidence because they make your business easier to understand. Before adding more campaigns, make sure the existing searcher journey is clear from the first click to the call or quote request.`,
        },
        {
            heading: "How to make the page more useful",
            body: `Use plain language that matches what customers ask in real life. Explain who the service is for, what problems you solve, where you work, what happens next, and what makes your company credible. Good local content should feel like a helpful sales conversation, not a pile of keywords.`,
        },
        {
            heading: "How to support trust",
            body: `Bring trust signals close to decision points. Reviews, project photos, credentials, guarantees, process details, and service-area proof should appear before the visitor has to decide whether to call. Do not bury the reasons to believe at the bottom of the page.`,
        },
        {
            heading: "What to measure",
            body: `Track practical outcomes: calls, form submissions, direction requests, high-intent page visits, and the terms that bring qualified visitors. Rankings matter, but the better question is whether visibility is turning into conversations with people who can become customers.`,
        },
    ]
}

export const webAuthorityArticles: WebAuthorityArticle[] = seeds.map((seed) => ({
    title: seed.title,
    slug: seed.slug,
    seoTitle: `${seed.title} | WebAuthority`,
    metaDescription: `Plain-English guidance on ${seed.primaryKeyword} for local service businesses that want better Google visibility, stronger trust, and more qualified calls.`,
    category: seed.category,
    primaryKeyword: seed.primaryKeyword,
    secondaryKeywords: [
        "local SEO for service businesses",
        "local search visibility",
        "local lead generation",
        "service business website strategy",
    ],
    excerpt: `A practical starter guide to ${seed.primaryKeyword}, built for local service businesses that want to become easier to find, trust, and contact.`,
    readTime: "6 min read",
    status: "starter",
    sections: buildSections(seed),
}))

export function getWebAuthorityArticle(slug: string) {
    return webAuthorityArticles.find((article) => article.slug === slug)
}
