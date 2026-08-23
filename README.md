# Main Street Media Co.

Main Street Media Co. (MSM) helps service businesses turn weak online visibility into measurable growth through audits, websites, automation, and ongoing optimization.

This repository contains the public MSM website and the WebAuthority article hub. It is a React + TypeScript application built with Vite and deployed as a static frontend.

## Project status

| Signal | Source |
| --- | --- |
| Production build | `npm run build` |
| Automated checks | GitHub Actions: typecheck/build and high-severity dependency audit |
| Dependency updates | Dependabot, weekly on Monday |
| Deployment | Vercel-managed production deployment |
| Executive reporting | MSM Executive Analytics Dashboard workbook |

The repository is considered review-ready when the **Project health** workflow passes and the changed user journey has been manually verified.

## Product surfaces

- Main MSM marketing and authority experience
- WebAuthority article routes under `/web-authority`
- Visibility audit request form
- Responsive production bundle generated in `dist/`

## Architecture

| Layer | Technology | Responsibility |
| --- | --- | --- |
| UI | React | Pages, components, and user interactions |
| Language | TypeScript | Compile-time contracts and safer refactoring |
| Build | Vite | Local development and optimized production output |
| Styling | CSS | Brand presentation and responsive behavior |
| Hosting | Vercel | Preview and production delivery |
| Audit intake | `POST /api/audit-request` | Server-side form processing supplied by the deployment environment |

The frontend must not contain private API keys or service credentials. Runtime secrets belong in the deployment platform and server-side integrations.

## Local development

### Requirements

- Node.js 22
- npm 10 or newer

### Setup

```bash
git clone https://github.com/mainstreetmediatn-git/main-street-media-co.git
cd main-street-media-co
npm ci
npm run dev
```

Vite prints the local preview URL after startup.

## Quality checks

Run the same core check used by CI:

```bash
npm ci
npm run build
npm audit --audit-level=high
```

`npm run build` executes TypeScript project compilation before Vite creates the production bundle. Pull requests and pushes to `main` run the checks automatically. Concurrent superseded runs are cancelled to reduce wasted build time.

## Visibility audit integration

The audit form submits JSON to:

```text
POST /api/audit-request
```

The deployed environment must provide this endpoint. Before release, verify:

1. Valid submissions return a successful response.
2. Required fields are rejected when missing.
3. Network and server failures produce a clear user-facing state.
4. No secret, internal error, or customer-sensitive data appears in browser logs.
5. Repeated submissions are protected by appropriate validation and rate limiting on the server.

## Deployment workflow

1. Create a focused branch.
2. Open a pull request against `main`.
3. Wait for **Project health** to pass.
4. Review the affected desktop and mobile journeys.
5. Confirm the Vercel preview behaves as expected.
6. Merge through the normal review flow.
7. Observe the production page and audit form after deployment.

The GitHub workflow validates code quality but does not modify production, DNS, credentials, or Vercel settings.

## Executive analytics dashboard

The companion workbook is the MSM operating scorecard. It tracks:

- portfolio health scores and repository priorities
- open pull requests, CI state, security risk, and deployment status
- sales stages, probability-weighted recurring revenue, and next contacts
- P1 actions, owners, due dates, blockers, and success measures

Refresh it during the weekly operating review and after material repository, deployment, or revenue changes. Treat **Unknown** as missing evidence, not as zero.

## Repository optimization standards

MSM projects should converge on these defaults:

- deterministic installs from a committed lockfile
- least-privilege GitHub Actions permissions
- required build and security checks before merge
- Dependabot updates for npm and GitHub Actions
- protected secrets and no credentials in frontend code
- concise architecture, setup, deployment, and rollback documentation
- explicit ownership for P1 blockers
- evidence-based readiness claims backed by CI and journey verification

Recommended repository settings include branch protection or rulesets requiring the Project health checks, secret scanning and push protection where available, and review approval before changes reach `main`.

## Contributing

Keep pull requests small and outcome-focused. Include:

- what changed and why
- the user journey affected
- verification commands and results
- screenshots for visible changes
- deployment or rollback considerations
- remaining risks or follow-up work

## License

No license is currently declared. Add one only after MSM chooses the intended reuse and distribution terms.
