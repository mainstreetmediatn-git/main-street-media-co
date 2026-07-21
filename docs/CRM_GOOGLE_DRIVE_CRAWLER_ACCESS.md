# CRM Google Drive crawler access

The lead crawler can deliver generated audit packages to the CRM Google Drive through a deployed Google Apps Script web app. This keeps Google Drive permissions inside the Google account that owns the CRM Drive folder and avoids storing Google service-account credentials in the website function.

The production Apps Script source lives at:

```text
integrations/google-apps-script/msm-crm-drive-webhook.js
```

## Canonical variable mapping

Use the existing server-side variable names already expected by `api/lead-crawl.ts`.

| Supplied value | Canonical location | Notes |
|---|---|---|
| `GOOGLE_APPS_SCRIPT_WEB_APP_URL` | Vercel env `LEAD_CRAWL_GOOGLE_DRIVE_WEBHOOK_URL` | Must be a deployed Apps Script Web App URL ending in `/exec`. Do not use `/dev`. |
| `CRM_GOOGLE_DRIVE_FOLDER_ID` | Apps Script script property `CRM_GOOGLE_DRIVE_FOLDER_ID` | Keep this inside Apps Script, not in client-side Vite variables. |
| shared secret | Vercel env and Apps Script script property `LEAD_CRAWL_GOOGLE_DRIVE_WEBHOOK_SECRET` | The values must match. |

Do not prefix these values with `VITE_`, `NEXT_PUBLIC_`, or any other client-exposed prefix.

## Apps Script deployment

1. Create a Google Apps Script project from the Google account that has write access to the CRM Drive folder.
2. Copy `integrations/google-apps-script/msm-crm-drive-webhook.js` into the Apps Script editor.
3. Set script properties:

```text
CRM_GOOGLE_DRIVE_FOLDER_ID=<CRM Drive folder ID>
LEAD_CRAWL_GOOGLE_DRIVE_WEBHOOK_SECRET=<long random shared secret>
```

4. Deploy as a Web App:

```text
Execute as: Me
Who has access: Anyone with the link
```

5. Copy the deployed `/exec` URL, not the development `/dev` URL.

## Safe validation

Health check:

```bash
curl -sS "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
```

Expected result:

```json
{"ok":true,"service":"msm-crm-drive-webhook","configured":true}
```

Dry run:

```bash
curl -sS -X POST "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec" \
  -H "content-type: application/json" \
  --data '{"secret":"<shared secret>","dryRun":true}'
```

Expected result:

```json
{"ok":true,"dryRun":true,"canCreateFolders":true}
```

The dry run opens the CRM root folder and verifies script access without creating lead folders or files.

## Vercel production environment

Set only server-side environment variables:

```bash
vercel env add LEAD_CRAWL_GOOGLE_DRIVE_WEBHOOK_URL production
vercel env add LEAD_CRAWL_GOOGLE_DRIVE_WEBHOOK_SECRET production
```

Preview and development should only receive these values when you intend those environments to write to the CRM Drive. For safer testing, use a separate sandbox CRM Drive folder and a separate Apps Script deployment.

## Production flow

When `LEAD_CRAWL_GOOGLE_DRIVE_WEBHOOK_URL` is set, `api/lead-crawl.ts` validates that it is a `https://script.google.com/.../exec` URL before posting. The POST includes:

- `target: "google_drive_crm"`
- `secret`
- `runId`
- `idempotencyKey`
- `sourceUrl`
- `leadPriority`
- `score`
- `grade`
- `auditBundle`

The Apps Script bridge:

- Finds or creates `{Business Name} - {City}` under the CRM root.
- Creates the standard Main Street Media lead subfolders.
- Saves or updates `reveal-visibility-audit.md`.
- Saves or updates `what-if-package.md`.
- Saves or updates `crm-record.json`.
- Writes `run-{runId}.json` in `01 Research`.
- Returns the lead folder URL, CRM record URL, saved file URLs, and duplicate-prevention status.

## Duplicate prevention

The bridge is idempotent at two levels:

- Existing lead folders are reused by exact folder name.
- Existing files are updated by exact file name instead of duplicated.

If the same `runId` is received again, the response returns `duplicatePrevented: true` and updates the existing lead package files rather than creating duplicates.

