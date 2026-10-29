CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    stable_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    industry TEXT,
    location TEXT,
    website TEXT,
    normalized_domain TEXT UNIQUE,
    public_phone TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT,
    role TEXT,
    email TEXT,
    normalized_email TEXT UNIQUE,
    email_source_url TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS research_sources (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    source_key TEXT NOT NULL UNIQUE,
    source_url TEXT NOT NULL,
    source_type TEXT NOT NULL,
    retrieved_at TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    excerpt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS findings (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    source_id TEXT NOT NULL REFERENCES research_sources(id) ON DELETE CASCADE,
    finding_key TEXT NOT NULL UNIQUE,
    finding_type TEXT NOT NULL,
    observed_text TEXT NOT NULL,
    evidence_url TEXT NOT NULL,
    observed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS qualifications (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    qualification_key TEXT NOT NULL UNIQUE,
    score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 10),
    status TEXT NOT NULL CHECK (status IN ('QUALIFIED', 'DISQUALIFIED')),
    reasons_json TEXT NOT NULL,
    recommended_service TEXT,
    next_action TEXT,
    assessed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS opportunities (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
    pipeline_stage TEXT NOT NULL,
    owner TEXT NOT NULL,
    next_action TEXT NOT NULL,
    due_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    stable_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    status TEXT NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('DRAFT_ONLY', 'AUTHORIZED_SEND')),
    sender_email TEXT,
    daily_limit INTEGER NOT NULL,
    cadence_json TEXT NOT NULL,
    authorization_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audits (
    id TEXT PRIMARY KEY,
    opportunity_id TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    audit_key TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    evidence_json TEXT NOT NULL,
    improvements_json TEXT NOT NULL,
    what_if_package TEXT NOT NULL,
    deliverable_path TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_messages (
    id TEXT PRIMARY KEY,
    idempotency_key TEXT NOT NULL UNIQUE,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
    opportunity_id TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('OUTBOUND', 'INBOUND')),
    status TEXT NOT NULL,
    provider TEXT NOT NULL,
    provider_message_id TEXT,
    provider_thread_id TEXT,
    to_email TEXT,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    draft_path TEXT,
    metadata_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    sent_at TEXT,
    UNIQUE(provider, provider_message_id)
);

CREATE TABLE IF NOT EXISTS replies (
    id TEXT PRIMARY KEY,
    provider_message_id TEXT UNIQUE,
    provider_thread_id TEXT,
    company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
    contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
    classification TEXT NOT NULL,
    body_excerpt TEXT NOT NULL,
    received_at TEXT NOT NULL,
    processed_at TEXT
);

CREATE TABLE IF NOT EXISTS follow_up_tasks (
    id TEXT PRIMARY KEY,
    opportunity_id TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL,
    offset_business_days INTEGER NOT NULL,
    planned_due_date TEXT NOT NULL,
    due_date TEXT,
    status TEXT NOT NULL,
    reason TEXT,
    email_message_id TEXT REFERENCES email_messages(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(opportunity_id, sequence_number)
);

CREATE TABLE IF NOT EXISTS suppressions (
    id TEXT PRIMARY KEY,
    normalized_email TEXT UNIQUE,
    normalized_domain TEXT,
    reason TEXT NOT NULL,
    source TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    job_key TEXT NOT NULL UNIQUE,
    job_type TEXT NOT NULL,
    status TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    available_at TEXT NOT NULL,
    locked_at TEXT,
    payload_json TEXT NOT NULL,
    last_error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS execution_runs (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL UNIQUE,
    command TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    checkpoint TEXT,
    counts_json TEXT NOT NULL,
    error TEXT
);

CREATE TABLE IF NOT EXISTS execution_logs (
    id TEXT PRIMARY KEY,
    run_id TEXT,
    level TEXT NOT NULL,
    event TEXT NOT NULL,
    details_json TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS checkpoints (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL,
    details_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(run_id, name)
);

CREATE TABLE IF NOT EXISTS legacy_crm_records (
    id TEXT PRIMARY KEY,
    source_file TEXT NOT NULL,
    source_key TEXT NOT NULL UNIQUE,
    record_json TEXT NOT NULL,
    imported_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_companies_domain ON companies(normalized_domain);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(normalized_email);
CREATE INDEX IF NOT EXISTS idx_findings_company ON findings(company_id);
CREATE INDEX IF NOT EXISTS idx_qualifications_score ON qualifications(score);
CREATE INDEX IF NOT EXISTS idx_email_status ON email_messages(status);
CREATE INDEX IF NOT EXISTS idx_followups_due ON follow_up_tasks(status, planned_due_date);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status, available_at);
CREATE INDEX IF NOT EXISTS idx_logs_run ON execution_logs(run_id, created_at);

