# Main Street Media Co. Automation

This package is a local, durable, draft-only sales-operations workflow for Memphis-area home-service prospects. It uses Python's standard library and SQLite; no third-party runtime dependency is required.

## Authoritative data and recovered work

The authoritative operational store for this deployment is data/main_street_media.sqlite3. The recovered Google Sheet is preserved in data/recovered_crm_pipeline.json and imported into legacy_crm_records before current records are processed. The current batch is data/production_batch_20261029.json.

The source website repository was verified at GitHub as mainstreetmediatn-git/main-street-media-co. Shell cloning was blocked by the managed PC GitHub proxy/permissions, so this automation package is staged in the writable temp workspace until a persistent writable project location is approved.

## Setup

1. Use Python 3.11+.
2. Optional isolated environment: py -3.11 -m venv .venv, then activate it.
3. Copy .env.example to .env only if local configuration is needed. Do not put connector tokens in files.
4. Initialize: python automation.py init
5. Import recovered CRM once: python automation.py import-legacy --input data/recovered_crm_pipeline.json
6. Run a batch: python automation.py run --input data/production_batch_20261029.json --limit 10

## Safe operations

- python automation.py status â€” counts, pause flags, last run.
- python automation.py pause / resume â€” global pause switch.
- python automation.py email-disable â€” separate email-send switch; remains off by default.
- python automation.py email-enable â€” only changes the local flag; it does not authorize sending.
- python automation.py backup â€” SQLite backup.
- python automation.py export-csv --input data/exports â€” CSV exports.
- python automation.py retry-failures â€” requeues failed jobs up to the bounded retry limit.
- python automation.py verify â€” deterministic end-to-end safety checks with no external sends.
- python automation.py schedule â€” installs/verifies a Windows Task Scheduler task for the configured project path.
- python automation.py link-provider-draft --idempotency-key KEY --provider gmail --provider-message-id ID â€” reconcile a provider-created draft.
- python automation.py reconcile-send --idempotency-key KEY --provider gmail --provider-message-id ID â€” reconcile an ambiguous provider send after searching the provider; never retry first.
- python automation.py reply --provider-message-id ID --classification interested|meeting_confirmed|not_now|unsubscribe|bounce|proposal_requested|complaint â€” apply a reviewed reply classification.
- python automation.py suppress --email ADDRESS --reason REASON --source SOURCE â€” add a suppression record and cancel pending follow-ups.

No command sends email in this package. Provider Gmail drafts are created only after live Gmail thread searches and manual review. A future send adapter must enforce suppression, recent replies, duplicate keys, campaign authorization, daily limits, placeholders, bookings, and uncertain-send reconciliation before calling a provider send operation.

## Current workflow

Discovery inputs are official public-source records. Each record is deduplicated by normalized domain and normalized email, scored 1â€“10, and stored with dated source/finding evidence. Score 8+ creates a qualified opportunity, an audit Markdown deliverable, and a personalized local draft. Follow-ups at 3/7/14 business days are persisted as INACTIVE until a confirmed initial send and explicit campaign authorization. Reply, opt-out, and bounce events stop pending sequences.

## Integration policy

See integrations.json. TinyFish is the active connected public-web research adapter. Firecrawl is available but not installed; Crawl4AI is not an available connector. Hunter is read-only enrichment in this environment with no sending inbox. Gmail and Drive/Sheets are connected. HubSpot is not used as the MSM CRM because the verified portal identity did not match MSM and write access needs reauthorization. The discovered Supabase MSM project is inactive, so it is not used as a hosted database.

## Scheduling and persistence

Windows Task Scheduler requires the PC to be on and the task service available. If the machine is asleep or powered off, the run waits until the next scheduled opportunity; the database and the scheduled script must remain in a persistent writable directory. This current managed environment only permits writes in a temp workspace, so this is a verified test scheduler rather than a durable production deployment until the package is moved to an approved persistent directory.

## Recovery

Back up before migrations and before each batch. If a run is interrupted, inspect status, the latest execution_runs, jobs, checkpoints, and logs; then run retry-failures. Idempotency keys make reruns safe. Restore by copying a verified SQLite backup to a new database path and setting AGENCY_DB_FILE to that path; keep the original until the restored database is inspected.

## Offers and compliance

No approved price sheet was recovered for this run, so drafts omit pricing. Audits contain observations and opportunities only; they do not guarantee rankings, leads, revenue, or free work. No real prospect email was sent. Do not activate sending or a provider sequence without explicit audience, sender, volume, cadence, and campaign authorization.


