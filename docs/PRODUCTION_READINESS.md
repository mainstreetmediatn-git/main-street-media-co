# Production Readiness

Date: 2026-08-08

Status legend: PASS, FAIL, BLOCKED, NOT RUN.

| Check | Status | Evidence / remaining work |
|---|---|---|
| Exact `master` versus `main` audit | PASS | See `docs/BRANCH_RECONCILIATION_AUDIT.md`. |
| Homepage build | PASS | Vite production build completes. |
| Primary local routes | PASS | `/`, `/audit`, `/services`, `/evolve`, `/ascend`, `/demo`, `/results`, `/about`, `/contact`, `/portal`, `/legal`, `/web-authority`, and `/web-authority/articles` returned HTTP 200 from the production preview server. |
| Dependency install | PASS | `npm ci` completed from the committed lockfile. |
| Dependency audit | PASS | `npm audit fix --package-lock-only` reports zero known vulnerabilities. |
| Typecheck | PASS | Frontend, API/tests, and Vite config typecheck successfully. |
| Lint | PASS | ESLint completes successfully. |
| Meaningful tests | PASS | 11 tests cover validation, ordering, persistence failure, Resend failure, analytics fault tolerance, durable-store envelope/idempotency, and both booking durations. |
| Production build | PASS | `npm run build` completes with Vite 6.4.3. |
| `/api/audit-request` order | PASS | Tests prove validate → persist → notify → analytics → response. |
| Database/storage failure handling | PASS | Persistence failure returns 503 and prevents notification. |
| Resend failure handling | PASS | Failure is logged and response states `saved: true` after persistence. |
| Analytics failure handling | PASS | Failure is logged and a saved/notified lead still receives HTTP 201. |
| Client conversion events | PASS | Started, submitted, successful, failed, booking CTA, 15-minute, 30-minute, phone, and email events are instrumented. |
| Cal.com profile | PASS | Public Cal.com profile exposes active 15-minute and 30-minute event types. |
| Cal.com direct 15-minute URL | PASS | Public URL returned HTTP 200 with booking content. |
| Cal.com direct 30-minute URL | PASS | Public URL returned HTTP 200 with booking content. |
| Durable production lead persistence | BLOCKED | Code and Google Drive adapter are ready; production `AUDIT_LEAD_STORE_URL`/secret must be configured and verified without exposing values. |
| Resend production inbox delivery | BLOCKED | Existing live endpoint works from the older deployment, but the stabilized preview requires an end-to-end request after durable storage is configured. |
| Google Analytics destination | BLOCKED | Event instrumentation is ready; no production `VITE_GA_MEASUREMENT_ID` has been verified. |
| Datadog normal-CI isolation | PASS | Missing credentials or test query produce an explicit skip, not a failed build. |
| Datadog real synthetic | BLOCKED | No credentials or real configured test query currently exist. |
| Vercel preview deployment | BLOCKED | No authenticated Vercel CLI/project link is available in this workspace. |
| Live UI parity with production source | FAIL | Current live bundle is stale relative to `origin/master`; preview must be reviewed before deployment. |
| Secrets committed | PASS | No secret values were added; only empty/example variables are tracked. |
| Actual production audit submission | NOT RUN | Must occur only after preview, storage, inbox, and deployment checks pass. |
| Canonical `main` conversion | NOT RUN | Explicitly gated on every production-critical item above. |
