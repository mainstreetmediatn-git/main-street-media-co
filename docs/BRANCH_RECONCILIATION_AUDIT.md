# Branch Reconciliation Audit

Date: 2026-08-08

## Baselines

- Temporary production source lineage: `origin/master` at `718ccdd`.
- GitHub default branch: `origin/main` at `9da67d9`.
- The histories have no merge base. They must not be combined with `--allow-unrelated-histories`.
- The live Vercel deployment is older than `origin/master`: its static bundle contains the local-marketing homepage, Calendly links, and `/api/audit-request`; `origin/master` currently renders the operator-platform homepage and sends `/audit` to `/api/lead-audit`.

## A. Main-only code worth preserving intentionally

- Cal.com account migration and the active `main-street-media-co-jfgesg` booking profile.
- The enterprise visual layer and the conversion-focused Main Street homepage as candidates for an explicit preview review.
- Modern split TypeScript configuration (`tsconfig.app.json`) if it improves the final build without weakening API typechecking.
- The newer homepage positioning and runtime metadata improvements, subject to live-funnel parity review.

## B. Obsolete or unsafe main-only code

- The Supabase-backed `/api/audit-request` implementation. Its project is paused, its Edge Function only stores a row, and it does not preserve Resend inbox notification.
- The Supabase origin configuration is inconsistent with the Vercel proxy.
- `latest` dependency ranges.
- The unconditional Datadog workflow with no normal build job; it fails immediately when secrets are absent.
- Runtime DOM mutation used to rewrite Calendly links and remove phone links. Booking and contact behavior should be explicit in React source.

## C. Production-lineage-only code

- Working Resend `/api/audit-request` implementation and documented destination `mainstreetmediatn@gmail.com`.
- Audit engine, lead audit, lead crawler, phase-two delivery, CRM webhook adapters, and Google Drive Apps Script bridge.
- SEO assets: robots, sitemap, structured metadata, noscript content, and Vercel SPA rewrites.
- Local scraper package and tests.
- Project boundary and operational status documentation.

## D. Conflicting implementations

- Lead intake: master Resend email versus main paused-Supabase insert.
- Primary UI: live local-marketing funnel versus master operator platform versus main enterprise local-service funnel.
- Audit route: `/api/audit-request` versus `/api/lead-audit`.
- Booking: Calendly in the live/master source versus profile-level Cal.com rewriting on main. The reconciled implementation uses explicit Cal.com `/15min` and `/30min` links.
- Contact fallback: phone/email links versus main's runtime removal of phone CTAs.

## E. Configuration and environment differences

- Master documents Resend, CRM, crawler, Google Drive, portal, and Calendly variables; main removes these files.
- Main hard-codes the Supabase project/function URL.
- Production stabilization requires `RESEND_API_KEY`, `AUDIT_FROM_EMAIL`, and durable storage (`AUDIT_LEAD_STORE_URL` plus its secret where applicable). `AUDIT_TO_EMAIL` remains `mainstreetmediatn@gmail.com`.
- Client analytics uses optional `VITE_GA_MEASUREMENT_ID`; server analytics uses optional webhook variables and cannot reject a saved lead.
- Datadog requires both secrets and `DATADOG_SYNTHETICS_TEST_SEARCH_QUERY`; otherwise its job is intentionally skipped.

## F. Dependency differences

- Master used caret ranges around React 19.1, Vite 6.3, TypeScript 5.8, and Resend 6.16.
- Main used unbounded `latest` ranges and removed Resend.
- Stabilization pins exact React, Vite, TypeScript, Resend, type, lint, and test versions and commits the npm lockfile.

## G. CI differences

- Master had no GitHub Actions validation workflow.
- Main had only an unconditional Datadog Synthetics job, which failed because `DD_API_KEY` and `DD_APP_KEY` were absent.
- Stabilization adds install, typecheck, lint, meaningful tests, and build. Datadog runs only when credentials and a real configured query all exist.

## Reconciliation rule

Create `reconcile/production-main` from the stabilized production lineage. Port the desirable items above by reviewed cherry-pick or clean reimplementation. Do not merge the unrelated histories, do not introduce the paused Supabase endpoint, and do not change production branch settings until the readiness report is fully green.
