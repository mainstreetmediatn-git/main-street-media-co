from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import re
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import uuid
from contextlib import contextmanager
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import urlparse

try:
    from zoneinfo import ZoneInfo
except ImportError:  # pragma: no cover
    ZoneInfo = None  # type: ignore


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = Path(os.getenv("AGENCY_DATA_DIR", str(BASE_DIR / "data")))
DB_PATH = Path(os.getenv("AGENCY_DB_FILE", str(DATA_DIR / "main_street_media.sqlite3")))
MIGRATIONS_DIR = BASE_DIR / "migrations"
LOCK_PATH = DATA_DIR / "run.lock"
REPORTS_DIR = DATA_DIR / "reports"
DRAFTS_DIR = DATA_DIR / "drafts"
AUDITS_DIR = DATA_DIR / "audits"
BACKUPS_DIR = DATA_DIR / "backups"
LOGS_DIR = DATA_DIR / "logs"

PIPELINE_RANK = {
    "NEW": 1,
    "RESEARCHING": 2,
    "QUALIFIED": 3,
    "AUDIT_READY": 4,
    "OUTREACH_DRAFTED": 5,
    "CONTACTED": 6,
    "ENGAGED": 7,
    "DISCOVERY_BOOKED": 8,
    "PROPOSAL_SENT": 9,
    "NEGOTIATION": 10,
    "WON": 11,
    "LOST": 11,
    "NURTURE": 12,
    "DISQUALIFIED": 12,
}


def now_utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def local_today() -> date:
    tz_name = os.getenv("AGENCY_TIMEZONE", "America/Chicago")
    if ZoneInfo:
        try:
            return datetime.now(ZoneInfo(tz_name)).date()
        except Exception:
            pass
    return datetime.now().date()


def stable_id(prefix: str, key: str) -> str:
    return f"{prefix}_{hashlib.sha256(key.encode('utf-8')).hexdigest()[:24]}"


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def redact(value: Any) -> Any:
    if isinstance(value, dict):
        return {k: redact(v) for k, v in value.items()}
    if isinstance(value, list):
        return [redact(v) for v in value]
    if isinstance(value, str):
        value = re.sub(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", "[email]", value, flags=re.I)
        value = re.sub(r"\b\+?\d[\d ().-]{8,}\d\b", "[phone]", value)
    return value


def json_write_atomic(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    tmp.replace(path)


def json_read(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return default


def normalize_email(value: Any) -> str | None:
    text = str(value or "").strip().lower()
    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", text):
        return None
    return text


def normalize_domain(value: Any) -> str | None:
    text = str(value or "").strip()
    if not text or text.lower() in {"unknown", "none", "n/a", "not found"}:
        return None
    parsed = urlparse(text if "://" in text else f"https://{text}")
    host = parsed.netloc.lower().removeprefix("www.").split(":", 1)[0]
    return host if "." in host else None


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")[:80]


def next_business_day(start: date, offset: int) -> date:
    current = start
    remaining = offset
    while remaining:
        current += timedelta(days=1)
        if current.weekday() < 5:
            remaining -= 1
    return current


def ensure_dirs() -> None:
    for path in (DATA_DIR, REPORTS_DIR, DRAFTS_DIR, AUDITS_DIR, BACKUPS_DIR, LOGS_DIR):
        path.mkdir(parents=True, exist_ok=True)


class Database:
    def __init__(self, path: Path = DB_PATH):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(str(path), timeout=15)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA foreign_keys = ON")
        self.conn.execute("PRAGMA busy_timeout = 15000")
        self.conn.execute("PRAGMA journal_mode = WAL")

    def close(self) -> None:
        self.conn.close()

    def migrate(self) -> None:
        self.conn.execute("CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)")
        for path in sorted(MIGRATIONS_DIR.glob("*.sql")):
            version = path.name
            found = self.conn.execute("SELECT 1 FROM schema_migrations WHERE version=?", (version,)).fetchone()
            if found:
                continue
            sql = path.read_text(encoding="utf-8")
            self.conn.executescript(sql)
            self.conn.execute("INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?)", (version, now_utc()))
            self.conn.commit()

    def execute(self, sql: str, params: tuple[Any, ...] = ()) -> sqlite3.Cursor:
        return self.conn.execute(sql, params)

    def commit(self) -> None:
        self.conn.commit()

    def one(self, sql: str, params: tuple[Any, ...] = ()) -> sqlite3.Row | None:
        return self.conn.execute(sql, params).fetchone()

    def all(self, sql: str, params: tuple[Any, ...] = ()) -> list[sqlite3.Row]:
        return list(self.conn.execute(sql, params).fetchall())


class FileLock:
    def __enter__(self) -> "FileLock":
        ensure_dirs()
        try:
            self.handle = os.open(str(LOCK_PATH), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        except FileExistsError as exc:
            detail = LOCK_PATH.read_text(encoding="utf-8", errors="ignore")[:200]
            raise RuntimeError(f"another run holds {LOCK_PATH}: {detail}") from exc
        os.write(self.handle, json.dumps({"pid": os.getpid(), "started_at": now_utc()}).encode("utf-8"))
        os.close(self.handle)
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        try:
            LOCK_PATH.unlink()
        except FileNotFoundError:
            pass


def set_setting(db: Database, key: str, value: Any) -> None:
    db.execute(
        "INSERT INTO settings(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at",
        (key, json.dumps(value), now_utc()),
    )
    db.commit()


def get_setting(db: Database, key: str, default: Any = None) -> Any:
    row = db.one("SELECT value FROM settings WHERE key=?", (key,))
    if not row:
        return default
    try:
        return json.loads(row["value"])
    except json.JSONDecodeError:
        return row["value"]


def log_event(db: Database, run_id: str | None, level: str, event: str, details: dict[str, Any] | None = None) -> None:
    payload = redact(details or {})
    db.execute(
        "INSERT INTO execution_logs(id,run_id,level,event,details_json,created_at) VALUES(?,?,?,?,?,?)",
        (stable_id("log", f"{run_id}:{event}:{now_utc()}:{uuid.uuid4()}"), run_id, level, event, json.dumps(payload), now_utc()),
    )
    db.commit()
    if run_id:
        line = {"run_id": run_id, "level": level, "event": event, "details": payload, "created_at": now_utc()}
        with (LOGS_DIR / f"{run_id}.jsonl").open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(line, ensure_ascii=False) + "\n")


def checkpoint(db: Database, run_id: str, name: str, status: str, details: dict[str, Any]) -> None:
    db.execute(
        "INSERT INTO checkpoints(id,run_id,name,status,details_json,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(run_id,name) DO UPDATE SET status=excluded.status,details_json=excluded.details_json,created_at=excluded.created_at",
        (stable_id("checkpoint", f"{run_id}:{name}"), run_id, name, status, json.dumps(redact(details)), now_utc()),
    )
    db.commit()


def ensure_campaign(db: Database) -> str:
    key = os.getenv("AGENCY_CAMPAIGN_KEY", "memphis-home-services-001")
    sender = os.getenv("GMAIL_SENDER_EMAIL") or os.getenv("SMTP_USERNAME") or "mainstreetmediatn@gmail.com"
    mode = os.getenv("AGENCY_EMAIL_MODE", "DRAFT_ONLY").upper()
    if mode not in {"DRAFT_ONLY", "AUTHORIZED_SEND"}:
        mode = "DRAFT_ONLY"
    campaign_id = stable_id("campaign", key)
    auth = {
        "audience": "Memphis-area local home-service businesses",
        "sender": sender,
        "volume": int(os.getenv("AGENCY_DAILY_SEND_LIMIT", "0")),
        "cadence_business_days": [3, 7, 14],
        "explicit_authorization": False,
        "email_send_enabled": False,
    }
    row = db.one("SELECT id FROM campaigns WHERE stable_key=?", (key,))
    if row:
        db.execute("UPDATE campaigns SET mode=?,sender_email=?,daily_limit=?,authorization_json=?,updated_at=? WHERE id=?", (mode, sender, int(os.getenv("AGENCY_DAILY_SEND_LIMIT", "0")), json.dumps(auth), now_utc(), row["id"]))
        db.commit()
        return row["id"]
    db.execute(
        "INSERT INTO campaigns(id,stable_key,name,status,mode,sender_email,daily_limit,cadence_json,authorization_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
        (campaign_id, key, os.getenv("AGENCY_CAMPAIGN_NAME", "Memphis Home Services - Review Queue"), "ACTIVE", mode, sender, int(os.getenv("AGENCY_DAILY_SEND_LIMIT", "0")), json.dumps([3, 7, 14]), json.dumps(auth), now_utc(), now_utc()),
    )
    db.commit()
    return campaign_id


def upsert_company(db: Database, record: dict[str, Any]) -> tuple[str, bool]:
    name = str(record.get("company_name") or record.get("business_name") or "").strip()
    domain = normalize_domain(record.get("website"))
    stable_key = f"domain:{domain}" if domain else f"name:{name.casefold()}"
    company_id = stable_id("company", stable_key)
    existing = db.one("SELECT id FROM companies WHERE stable_key=?", (stable_key,))
    payload = (name, record.get("industry"), record.get("location"), record.get("website"), domain, record.get("public_phone"), now_utc())
    if existing:
        db.execute("UPDATE companies SET name=?,industry=?,location=?,website=?,normalized_domain=?,public_phone=?,updated_at=? WHERE id=?", payload + (existing["id"],))
        db.commit()
        return existing["id"], False
    db.execute("INSERT INTO companies(id,stable_key,name,industry,location,website,normalized_domain,public_phone,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)", (company_id, stable_key, *payload[:-1], payload[-1], payload[-1]))
    db.commit()
    return company_id, True


def upsert_contact(db: Database, company_id: str, record: dict[str, Any]) -> tuple[str | None, bool]:
    email = normalize_email(record.get("email"))
    name = str(record.get("contact_name") or "").strip() or None
    role = str(record.get("contact_role") or "").strip() or None
    if not email and not name:
        return None, False
    key = email or f"{company_id}:{name}:{role}"
    contact_id = stable_id("contact", key)
    existing = db.one("SELECT id FROM contacts WHERE id=? OR normalized_email=?", (contact_id, email)) if email else db.one("SELECT id FROM contacts WHERE id=?", (contact_id,))
    if existing:
        db.execute("UPDATE contacts SET company_id=?,name=?,role=?,email=?,normalized_email=?,email_source_url=?,updated_at=? WHERE id=?", (company_id, name, role, email, email, record.get("email_source_url"), now_utc(), existing["id"]))
        db.commit()
        return existing["id"], False
    db.execute("INSERT INTO contacts(id,company_id,name,role,email,normalized_email,email_source_url,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)", (contact_id, company_id, name, role, email, email, record.get("email_source_url"), now_utc(), now_utc()))
    db.commit()
    return contact_id, True


def upsert_source_and_finding(db: Database, company_id: str, record: dict[str, Any], retrieved_at: str) -> tuple[str, bool, str, bool]:
    source_url = str(record.get("source_url") or record.get("website") or "").strip()
    excerpt = str(record.get("evidence_excerpt") or record.get("observed_gap") or "").strip()
    content_hash = sha256_text(excerpt)
    source_key = sha256_text(f"{source_url}|{content_hash}")
    source_id = stable_id("source", source_key)
    existing = db.one("SELECT id FROM research_sources WHERE source_key=?", (source_key,))
    if existing:
        source_id = existing["id"]
        db.execute("UPDATE research_sources SET company_id=?,source_url=?,retrieved_at=?,content_hash=?,excerpt=? WHERE id=?", (company_id, source_url, retrieved_at, content_hash, excerpt, source_id))
        source_created = False
    else:
        db.execute("INSERT INTO research_sources(id,company_id,source_key,source_url,source_type,retrieved_at,content_hash,excerpt) VALUES(?,?,?,?,?,?,?,?)", (source_id, company_id, source_key, source_url, "official_website", retrieved_at, content_hash, excerpt))
        source_created = True
    finding_key = sha256_text(f"{company_id}|{source_key}|{record.get('observed_gap')}")
    finding_id = stable_id("finding", finding_key)
    finding_exists = db.one("SELECT id FROM findings WHERE finding_key=?", (finding_key,))
    if finding_exists:
        db.execute("UPDATE findings SET observed_text=?,evidence_url=?,observed_at=? WHERE id=?", (str(record.get("observed_gap") or ""), source_url, retrieved_at, finding_exists["id"]))
        finding_created = False
    else:
        db.execute("INSERT INTO findings(id,company_id,source_id,finding_key,finding_type,observed_text,evidence_url,observed_at) VALUES(?,?,?,?,?,?,?,?)", (finding_id, company_id, source_id, finding_key, "marketing_conversion_gap", str(record.get("observed_gap") or ""), source_url, retrieved_at))
        finding_created = True
    db.commit()
    return source_id, source_created, content_hash, finding_created


def upsert_qualification(db: Database, company_id: str, record: dict[str, Any], content_hash: str, assessed_at: str) -> tuple[str, bool]:
    score = int(record.get("score") or 1)
    score = max(1, min(10, score))
    status = "QUALIFIED" if score >= 8 else "DISQUALIFIED"
    key = f"{company_id}:{content_hash}"
    qualification_id = stable_id("qualification", key)
    reasons = record.get("score_reasons") or []
    existing = db.one("SELECT id FROM qualifications WHERE qualification_key=?", (key,))
    params = (score, status, json.dumps(reasons), record.get("recommended_service"), record.get("next_action"), assessed_at)
    if existing:
        db.execute("UPDATE qualifications SET score=?,status=?,reasons_json=?,recommended_service=?,next_action=?,assessed_at=? WHERE id=?", params + (existing["id"],))
        db.commit()
        return existing["id"], False
    db.execute("INSERT INTO qualifications(id,company_id,qualification_key,score,status,reasons_json,recommended_service,next_action,assessed_at) VALUES(?,?,?,?,?,?,?,?,?)", (qualification_id, company_id, key, *params))
    db.commit()
    return qualification_id, True


def upsert_opportunity(db: Database, company_id: str, score: int, next_action_text: str, run_date: date) -> tuple[str, bool]:
    existing = db.one("SELECT * FROM opportunities WHERE company_id=?", (company_id,))
    owner = os.getenv("AGENCY_OWNER", "Main Street Media Co.")
    candidate = "QUALIFIED" if score >= 8 else "NEW"
    due = str(run_date if run_date.weekday() < 5 else next_business_day(run_date, 1))
    if existing:
        current = existing["pipeline_stage"]
        stage = current if PIPELINE_RANK.get(current, 0) >= PIPELINE_RANK.get(candidate, 0) else candidate
        db.execute("UPDATE opportunities SET pipeline_stage=?,owner=?,next_action=?,due_date=?,updated_at=? WHERE id=?", (stage, owner, next_action_text, existing["due_date"] or due, now_utc(), existing["id"]))
        db.commit()
        return existing["id"], False
    opportunity_id = stable_id("opportunity", company_id)
    db.execute("INSERT INTO opportunities(id,company_id,pipeline_stage,owner,next_action,due_date,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)", (opportunity_id, company_id, candidate, owner, next_action_text, due, "ACTIVE", now_utc(), now_utc()))
    db.commit()
    return opportunity_id, True


def advance_opportunity(db: Database, opportunity_id: str, candidate: str, next_action_text: str) -> None:
    row = db.one("SELECT pipeline_stage FROM opportunities WHERE id=?", (opportunity_id,))
    if not row:
        return
    current = row["pipeline_stage"]
    stage = candidate if PIPELINE_RANK.get(candidate, 0) > PIPELINE_RANK.get(current, 0) else current
    db.execute("UPDATE opportunities SET pipeline_stage=?,next_action=?,updated_at=? WHERE id=?", (stage, next_action_text, now_utc(), opportunity_id))
    db.commit()


def is_suppressed(db: Database, email: str | None, domain: str | None) -> bool:
    if email and db.one("SELECT 1 FROM suppressions WHERE normalized_email=?", (email,)):
        return True
    if domain and db.one("SELECT 1 FROM suppressions WHERE normalized_domain=?", (domain,)):
        return True
    return False


def write_audit(db: Database, company_id: str, opportunity_id: str, record: dict[str, Any], content_hash: str) -> tuple[bool, str]:
    audit_key = f"{opportunity_id}:{content_hash}"
    existing = db.one("SELECT deliverable_path FROM audits WHERE audit_key=?", (audit_key,))
    path = AUDITS_DIR / f"{slug(str(record.get('company_name')))}-visibility-audit.md"
    improvements = record.get("improvements") or []
    evidence = [{"url": record.get("source_url"), "excerpt": record.get("evidence_excerpt"), "observed_gap": record.get("observed_gap")}]
    content = [
        f"# Visibility Audit â€” {record.get('company_name')}",
        "",
        "Status: reviewable draft based only on the cited public source.",
        "",
        "## Verified observation",
        f"{record.get('observed_gap')}",
        "",
        f"Evidence: {record.get('source_url')}",
        f"> {record.get('evidence_excerpt')}",
        "",
        "## Three actionable improvements",
    ]
    content.extend(f"{index}. {item}" for index, item in enumerate(improvements[:3], 1))
    content.extend(["", "## What-If Package", str(record.get("what_if_package") or "Not supplied."), "", "## Guardrails", "No ranking, revenue, lead-volume, or other outcome is guaranteed. Pricing is intentionally omitted because no approved price sheet was recovered.", ""])
    json_write_atomic(path, {"company": record.get("company_name"), "evidence": evidence, "improvements": improvements[:3], "what_if_package": record.get("what_if_package"), "markdown": "\n".join(content)})
    path.with_suffix(".md").write_text("\n".join(content), encoding="utf-8")
    if existing:
        db.execute("UPDATE audits SET title=?,evidence_json=?,improvements_json=?,what_if_package=?,deliverable_path=? WHERE audit_key=?", (f"Visibility Audit â€” {record.get('company_name')}", json.dumps(evidence), json.dumps(improvements[:3]), record.get("what_if_package"), str(path), audit_key))
        db.commit()
        return False, str(path)
    audit_id = stable_id("audit", audit_key)
    db.execute("INSERT INTO audits(id,opportunity_id,audit_key,title,evidence_json,improvements_json,what_if_package,deliverable_path,created_at) VALUES(?,?,?,?,?,?,?,?,?)", (audit_id, opportunity_id, audit_key, f"Visibility Audit â€” {record.get('company_name')}", json.dumps(evidence), json.dumps(improvements[:3]), record.get("what_if_package"), str(path), now_utc()))
    db.commit()
    return True, str(path)


def create_email_draft(db: Database, company_id: str, contact_id: str, opportunity_id: str, campaign_id: str, record: dict[str, Any], content_hash: str) -> tuple[bool, str | None]:
    email = normalize_email(record.get("email"))
    if not email:
        return False, None
    domain = normalize_domain(record.get("website"))
    if is_suppressed(db, email, domain):
        return False, "suppressed"
    idempotency_key = sha256_text(f"{campaign_id}|{email}|{content_hash}")
    existing = db.one("SELECT id FROM email_messages WHERE idempotency_key=?", (idempotency_key,))
    if existing:
        return False, "existing"
    company = str(record.get("company_name"))
    subject = f"A quick visibility note for {company}"
    body = (
        f"Hello {company} team,\n\n"
        f"Iâ€™m with Main Street Media Co. in Memphis. I noticed this on your public site: {record.get('observed_gap')}\n\n"
        f"If youâ€™re the right person for marketing or customer acquisition, would you be open to a 15-minute conversation about whether {record.get('recommended_service')} is worth prioritizing?\n\n"
        "Thank you,"
    )
    draft_path = DRAFTS_DIR / f"{slug(company)}.eml"
    draft_path.write_text(f"To: {email}\nSubject: {subject}\n\n{body}\n", encoding="utf-8")
    message_id = stable_id("email", idempotency_key)
    db.execute("INSERT INTO email_messages(id,idempotency_key,company_id,contact_id,opportunity_id,campaign_id,direction,status,provider,to_email,subject,body,draft_path,metadata_json,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", (message_id, idempotency_key, company_id, contact_id, opportunity_id, campaign_id, "OUTBOUND", "DRAFTED", "local", email, subject, body, str(draft_path), json.dumps({"source_url": record.get("source_url"), "content_hash": content_hash, "send_checks": {"suppression": True, "recent_thread": "not_checked_before_draft", "duplicate_key": idempotency_key, "authorization": "DRAFT_ONLY", "placeholders": False}}), now_utc()))
    db.commit()
    advance_opportunity(db, opportunity_id, "OUTREACH_DRAFTED", "Review draft, verify Gmail thread state, and approve or hold.")
    for number, offset in enumerate((3, 7, 14), 1):
        planned = str(next_business_day(local_today(), offset))
        followup_id = stable_id("followup", f"{opportunity_id}:{number}")
        db.execute("INSERT INTO follow_up_tasks(id,opportunity_id,campaign_id,sequence_number,offset_business_days,planned_due_date,due_date,status,reason,email_message_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(opportunity_id,sequence_number) DO UPDATE SET planned_due_date=excluded.planned_due_date,updated_at=excluded.updated_at", (followup_id, opportunity_id, campaign_id, number, offset, planned, None, "INACTIVE", "Awaiting explicit send authorization and a confirmed initial send.", message_id, now_utc(), now_utc()))
    db.commit()
    return True, message_id


def normalize_input_record(record: dict[str, Any]) -> dict[str, Any]:
    """Accept the human-readable batch format and map it to the database fields."""
    if "company_name" in record:
        return record
    source_urls = record.get("source_urls") or []
    source_url = source_urls[0] if source_urls else record.get("website")
    return {
        **record,
        "company_name": record.get("name"),
        "public_phone": record.get("phone"),
        "email_source_url": record.get("email_source") or source_url,
        "source_url": source_url,
        "observed_gap": record.get("observation"),
        "evidence_excerpt": record.get("evidence"),
        "what_if_package": record.get("what_if"),
    }


def run_pipeline(source_path: Path, db_path: Path = DB_PATH, limit: int | None = None, command: str = "run") -> dict[str, Any]:
    ensure_dirs()
    with FileLock():
        db = Database(db_path)
        db.migrate()
        run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
        counts: dict[str, Any] = {"researched": 0, "qualified": 0, "created": 0, "updated": 0, "audits_produced": 0, "drafts_prepared": 0, "messages_confirmed_sent": 0, "replies_processed": 0, "followups_due": 0, "failures": 0, "blockers": []}
        db.execute("INSERT INTO execution_runs(id,run_id,command,status,started_at,counts_json) VALUES(?,?,?,?,?,?)", (stable_id("run", run_id), run_id, command, "RUNNING", now_utc(), json.dumps(counts)))
        db.commit()
        log_event(db, run_id, "INFO", "run_started", {"source": str(source_path), "limit": limit})
        campaign_id = ensure_campaign(db)
        if get_setting(db, "global_pause", False):
            db.execute("UPDATE execution_runs SET status=?,finished_at=?,checkpoint=?,counts_json=? WHERE run_id=?", ("PAUSED", now_utc(), "paused-before-discovery", json.dumps(counts), run_id))
            db.commit()
            db.close()
            return {"run_id": run_id, **counts, "status": "PAUSED"}
        job_key = f"batch:{run_id}"
        db.execute("INSERT INTO jobs(id,job_key,job_type,status,attempts,max_attempts,available_at,payload_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)", (stable_id("job", job_key), job_key, "batch", "RUNNING", 1, 3, now_utc(), json.dumps({"source": str(source_path)}), now_utc(), now_utc()))
        db.commit()
        try:
            payload = json_read(source_path, {})
            records = (payload.get("businesses") or payload.get("records") or []) if isinstance(payload, dict) else []
            max_records = limit or int(os.getenv("AGENCY_BATCH_LIMIT", "10"))
            records = records[:max_records]
            checkpoint(db, run_id, "discovery", "COMPLETE", {"source": str(source_path), "records": len(records)})
            for record in records:
                record = normalize_input_record(record)
                counts["researched"] += 1
                company_id, company_created = upsert_company(db, record)
                if company_created:
                    counts["created"] += 1
                else:
                    counts["updated"] += 1
                contact_id, contact_created = upsert_contact(db, company_id, record)
                if contact_created:
                    counts["created"] += 1
                elif contact_id:
                    counts["updated"] += 1
                _, source_created, content_hash, _ = upsert_source_and_finding(db, company_id, record, now_utc())
                if source_created:
                    counts["created"] += 1
                else:
                    counts["updated"] += 1
                _, qualification_created = upsert_qualification(db, company_id, record, content_hash, now_utc())
                if qualification_created:
                    counts["created"] += 1
                else:
                    counts["updated"] += 1
                score = max(1, min(10, int(record.get("score") or 1)))
                opportunity_id, opportunity_created = upsert_opportunity(db, company_id, score, str(record.get("next_action") or "Review qualified record."), local_today())
                if opportunity_created:
                    counts["created"] += 1
                else:
                    counts["updated"] += 1
                if score >= 8:
                    counts["qualified"] += 1
                    audit_created, audit_path = write_audit(db, company_id, opportunity_id, record, content_hash)
                    if audit_created:
                        counts["audits_produced"] += 1
                        counts["created"] += 1
                    advance_opportunity(db, opportunity_id, "AUDIT_READY", "Review audit and approve or hold outreach.")
                    if contact_id:
                        drafted, reason = create_email_draft(db, company_id, contact_id, opportunity_id, campaign_id, record, content_hash)
                        if drafted:
                            counts["drafts_prepared"] += 1
                            counts["created"] += 1
                        elif reason == "suppressed":
                            counts["blockers"].append(f"suppressed:{record.get('company_name')}")
                    else:
                        counts["blockers"].append(f"no_verified_email:{record.get('company_name')}")
                else:
                    counts["blockers"].append(f"below_threshold:{record.get('company_name')}")
            checkpoint(db, run_id, "qualification_audit_outreach", "COMPLETE", counts)
            due = db.one("SELECT COUNT(*) AS n FROM follow_up_tasks WHERE status='DUE' AND planned_due_date<=?", (str(local_today()),))
            counts["followups_due"] = int(due["n"] if due else 0)
            db.execute("UPDATE jobs SET status=?,updated_at=? WHERE job_key=?", ("COMPLETED", now_utc(), job_key))
            db.execute("UPDATE execution_runs SET status=?,finished_at=?,checkpoint=?,counts_json=? WHERE run_id=?", ("SUCCEEDED", now_utc(), "complete", json.dumps(counts), run_id))
            db.commit()
            log_event(db, run_id, "INFO", "run_succeeded", counts)
            backup_path = backup_database(db, run_id)
            report = {"run_id": run_id, "status": "SUCCEEDED", **counts, "backup": str(backup_path), "database": str(db_path)}
            json_write_atomic(REPORTS_DIR / f"{run_id}.json", report)
            db.close()
            return report
        except Exception as exc:
            counts["failures"] += 1
            counts["blockers"].append(str(exc))
            db.execute("UPDATE jobs SET status=?,last_error=?,updated_at=? WHERE job_key=?", ("FAILED", redact(str(exc)), now_utc(), job_key))
            db.execute("UPDATE execution_runs SET status=?,finished_at=?,checkpoint=?,counts_json=?,error=? WHERE run_id=?", ("FAILED", now_utc(), "error", json.dumps(counts), redact(str(exc)), run_id))
            db.commit()
            log_event(db, run_id, "ERROR", "pipeline_failed", {"error": str(exc)})
            db.close()
            return {"run_id": run_id, "status": "FAILED", **counts}


def backup_database(db: Database, run_id: str | None = None) -> Path:
    ensure_dirs()
    name = run_id or datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    path = BACKUPS_DIR / f"main_street_media_{name}.sqlite3"
    target = sqlite3.connect(str(path))
    with target:
        db.conn.backup(target)
    target.close()
    return path


def import_legacy(path: Path, db_path: Path = DB_PATH) -> dict[str, Any]:
    ensure_dirs()
    db = Database(db_path)
    db.migrate()
    payload = json_read(path, {})
    rows = payload.get("records", []) if isinstance(payload, dict) else []
    imported = 0
    mapped = 0
    for record in rows:
        source_key = str(record.get("Lead ID") or sha256_text(json.dumps(record, sort_keys=True)))
        existing = db.one("SELECT id FROM legacy_crm_records WHERE source_key=?", (source_key,))
        legacy_id = existing["id"] if existing else stable_id("legacy", source_key)
        db.execute("INSERT INTO legacy_crm_records(id,source_file,source_key,record_json,imported_at) VALUES(?,?,?,?,?) ON CONFLICT(source_key) DO UPDATE SET record_json=excluded.record_json,imported_at=excluded.imported_at", (legacy_id, str(path), source_key, json.dumps(record, ensure_ascii=False), now_utc()))
        imported += 0 if existing else 1
        name = str(record.get("Business Name") or "").strip()
        if not name:
            continue
        mapped_record = {
            "company_name": name,
            "industry": record.get("Category"),
            "location": record.get("Area / ZIP"),
            "website": record.get("Website") if str(record.get("Website") or "").startswith("http") else None,
            "public_phone": record.get("Phone"),
            "email": record.get("Email") if normalize_email(record.get("Email")) else None,
            "email_source_url": record.get("Website"),
            "contact_name": record.get("Owner / Manager"),
            "score": max(1, min(10, round(float(str(record.get("Priority Score") or "0").replace(",", ".")) / 10))),
            "score_reasons": [record.get("Reason Fit / Main Weakness")],
            "observed_gap": record.get("Reason Fit / Main Weakness") or "Recovered from the prior CRM sheet; current website observation not reverified.",
            "evidence_excerpt": record.get("Notes") or "Recovered CRM record; source details preserved in legacy_crm_records.",
            "source_url": record.get("Source Thread") or "drive://CRM PIPELINE",
            "recommended_service": record.get("Recommended Offer") or "local SEO",
            "next_action": record.get("Next Action") or "Review recovered record.",
        }
        company_id, _ = upsert_company(db, mapped_record)
        contact_id, _ = upsert_contact(db, company_id, mapped_record)
        source_id, _, content_hash, _ = upsert_source_and_finding(db, company_id, mapped_record, now_utc())
        _, _ = upsert_qualification(db, company_id, mapped_record, content_hash, now_utc())
        opportunity_id, _ = upsert_opportunity(db, company_id, mapped_record["score"], mapped_record["next_action"], local_today())
        if record.get("Package Status") or record.get("Source Thread"):
            audit_key = f"legacy:{source_key}"
            if not db.one("SELECT 1 FROM audits WHERE audit_key=?", (audit_key,)):
                db.execute("INSERT INTO audits(id,opportunity_id,audit_key,title,evidence_json,improvements_json,what_if_package,deliverable_path,created_at) VALUES(?,?,?,?,?,?,?,?,?)", (stable_id("audit", audit_key), opportunity_id, audit_key, f"Recovered audit â€” {name}", json.dumps({"legacy_record": source_key, "source": record.get("Source Thread")}), json.dumps([]), "Recovered prior package details; do not treat as current audit evidence.", str(record.get("Source Thread") or "drive://CRM PIPELINE"), now_utc()))
        mapped += 1
    db.commit()
    backup = backup_database(db, "legacy-import")
    db.close()
    return {"status": "SUCCEEDED", "records_imported": imported, "companies_mapped": mapped, "backup": str(backup)}


def link_provider_draft(db: Database, idempotency_key: str, provider: str, provider_message_id: str, provider_thread_id: str | None = None, provider_draft_id: str | None = None) -> dict[str, Any]:
    row = db.one("SELECT id,metadata_json FROM email_messages WHERE idempotency_key=?", (idempotency_key,))
    if not row:
        raise ValueError("unknown idempotency key")
    try:
        metadata = json.loads(row["metadata_json"] or "{}")
    except json.JSONDecodeError:
        metadata = {}
    if provider_draft_id:
        metadata["provider_draft_id"] = provider_draft_id
    metadata["provider_linked_at"] = now_utc()
    db.execute("UPDATE email_messages SET provider=?,provider_message_id=?,provider_thread_id=?,metadata_json=?,status=? WHERE id=?", (provider, provider_message_id, provider_thread_id, json.dumps(metadata), "DRAFTED", row["id"]))
    db.commit()
    return {"status": "linked", "message_id": row["id"], "provider": provider, "provider_message_id": provider_message_id}


def reconcile_uncertain_send(db: Database, idempotency_key: str, provider: str, provider_message_id: str | None = None, provider_thread_id: str | None = None) -> dict[str, Any]:
    """Resolve an ambiguous provider send without issuing a retry from this process."""
    row = db.one("SELECT id,status,opportunity_id FROM email_messages WHERE idempotency_key=?", (idempotency_key,))
    if not row:
        raise ValueError("unknown idempotency key")
    if row["status"] not in {"SENDING_UNCERTAIN", "SEND_REQUIRES_RECONCILIATION"}:
        return {"status": "not_uncertain", "message_id": row["id"], "current_status": row["status"]}
    if not provider_message_id:
        return {"status": "unresolved", "message_id": row["id"], "action": "search_provider_before_retry"}
    db.execute("UPDATE email_messages SET provider=?,provider_message_id=?,provider_thread_id=?,status=?,sent_at=? WHERE id=?", (provider, provider_message_id, provider_thread_id, "SENT_CONFIRMED", now_utc(), row["id"]))
    advance_opportunity(db, row["opportunity_id"], "CONTACTED", "Monitor the live thread and process replies before any follow-up.")
    db.commit()
    return {"status": "reconciled", "message_id": row["id"], "provider": provider, "provider_message_id": provider_message_id}


def apply_reply(db: Database, provider_message_id: str, classification: str, body_excerpt: str = "", company_id: str | None = None, contact_id: str | None = None) -> dict[str, Any]:
    classification = classification.lower().strip()
    reply_id = stable_id("reply", provider_message_id)
    db.execute("INSERT INTO replies(id,provider_message_id,company_id,contact_id,classification,body_excerpt,received_at,processed_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(provider_message_id) DO UPDATE SET classification=excluded.classification,body_excerpt=excluded.body_excerpt,processed_at=excluded.processed_at", (reply_id, provider_message_id, company_id, contact_id, classification, body_excerpt[:1000], now_utc(), now_utc()))
    if company_id:
        opp = db.one("SELECT id FROM opportunities WHERE company_id=?", (company_id,))
        if opp:
            if classification in {"interested", "proposal_requested"}:
                advance_opportunity(db, opp["id"], "ENGAGED", "Prepare the approved next step and confirm owner review.")
            elif classification == "meeting_confirmed":
                advance_opportunity(db, opp["id"], "DISCOVERY_BOOKED", "Prepare for the verified discovery meeting.")
            elif classification == "not_now":
                advance_opportunity(db, opp["id"], "NURTURE", "Schedule a dated nurture check-in.")
            elif classification in {"not_interested", "unsubscribe", "bounce"}:
                advance_opportunity(db, opp["id"], "NURTURE" if classification != "bounce" else "DISQUALIFIED", "Sequence stopped; suppression or bounce recorded.")
            else:
                advance_opportunity(db, opp["id"], "QUALIFIED", "Flag for human review.")
            db.execute("UPDATE follow_up_tasks SET status=?,reason=?,updated_at=? WHERE opportunity_id=? AND status IN ('INACTIVE','DUE','READY')", ("CANCELLED", f"stopped_by_reply:{classification}", now_utc(), opp["id"]))
    db.commit()
    return {"status": "processed", "classification": classification, "reply_id": reply_id}


def add_suppression(db: Database, email: str | None, domain: str | None, reason: str, source: str) -> dict[str, Any]:
    normalized = normalize_email(email)
    normalized_domain = normalize_domain(domain)
    db.execute("INSERT INTO suppressions(id,normalized_email,normalized_domain,reason,source,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(normalized_email) DO UPDATE SET reason=excluded.reason,source=excluded.source,created_at=excluded.created_at", (stable_id("suppression", normalized or normalized_domain or source), normalized, normalized_domain, reason, source, now_utc()))
    if normalized:
        db.execute("UPDATE follow_up_tasks SET status='CANCELLED',reason=?,updated_at=? WHERE email_message_id IN (SELECT id FROM email_messages WHERE to_email=?) AND status IN ('INACTIVE','DUE','READY')", (f"suppressed:{reason}", now_utc(), normalized))
    db.commit()
    return {"status": "suppressed", "email": bool(normalized), "domain": normalized_domain}


def retry_failures(db: Database) -> dict[str, Any]:
    rows = db.all("SELECT id,job_key,attempts,max_attempts FROM jobs WHERE status='FAILED' AND attempts < max_attempts")
    for row in rows:
        db.execute("UPDATE jobs SET status='QUEUED',available_at=?,updated_at=? WHERE id=?", (now_utc(), now_utc(), row["id"]))
    db.commit()
    return {"requeued": len(rows)}


def status_report(db: Database) -> dict[str, Any]:
    counts = {}
    for table in ("companies", "contacts", "research_sources", "findings", "qualifications", "opportunities", "audits", "email_messages", "replies", "follow_up_tasks", "suppressions", "jobs", "execution_runs"):
        row = db.one(f"SELECT COUNT(*) AS n FROM {table}")
        counts[table] = int(row["n"])
    last = db.one("SELECT run_id,status,finished_at,counts_json FROM execution_runs ORDER BY started_at DESC LIMIT 1")
    counts["global_pause"] = bool(get_setting(db, "global_pause", False))
    counts["email_send_enabled"] = bool(get_setting(db, "email_send_enabled", False))
    counts["last_run"] = dict(last) if last else None
    return counts


def export_csv(db: Database, path: Path) -> dict[str, Any]:
    rows = db.all("SELECT c.name,c.industry,c.location,c.website,c.public_phone,co.name AS contact_name,co.email,q.score,q.status,o.pipeline_stage,o.owner,o.next_action,o.due_date FROM companies c LEFT JOIN contacts co ON co.company_id=c.id LEFT JOIN qualifications q ON q.company_id=c.id LEFT JOIN opportunities o ON o.company_id=c.id ORDER BY q.score DESC,c.name")
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(rows[0].keys() if rows else ["name"])
        writer.writerows([tuple(row) for row in rows])
    return {"path": str(path), "rows": len(rows)}


def verify() -> dict[str, Any]:
    ensure_dirs()
    with tempfile.TemporaryDirectory(prefix="msm-verify-") as temp:
        root = Path(temp)
        db_path = root / "verify.sqlite3"
        source = root / "source.json"
        record = {
            "company_name": "Owner-Controlled Test HVAC",
            "industry": "HVAC",
            "location": "Memphis, TN",
            "website": "https://test-hvac.example.invalid",
            "public_phone": "901-555-0100",
            "email": "owner@example.invalid",
            "email_source_url": "https://test-hvac.example.invalid/contact",
            "source_url": "https://test-hvac.example.invalid/contact",
            "evidence_excerpt": "Contact page exposes a phone number and a request form.",
            "observed_gap": "The request path does not state what happens after submission.",
            "score": 9,
            "score_reasons": ["Memphis geography", "home-service fit", "observed conversion gap", "public email route", "approved service fit"],
            "recommended_service": "website conversion review",
            "next_action": "Review the audit and draft.",
            "improvements": ["Add an explicit response-time expectation.", "Use one primary CTA label.", "Add a confirmation state."],
            "what_if_package": "A clearer service page with one request path and a transparent confirmation step.",
        }
        json_write_atomic(source, {"businesses": [record]})
        first = run_pipeline(source, db_path, limit=10, command="verify-first")
        second = run_pipeline(source, db_path, limit=10, command="verify-rerun")
        db = Database(db_path)
        db.migrate()
        assert first["researched"] == 1 and first["qualified"] == 1 and first["audits_produced"] == 1 and first["drafts_prepared"] == 1
        assert second["researched"] == 1 and second["audits_produced"] == 0 and second["drafts_prepared"] == 0
        assert db.one("SELECT COUNT(*) AS n FROM companies")["n"] == 1
        assert db.one("SELECT COUNT(*) AS n FROM email_messages")["n"] == 1
        followups = db.all("SELECT planned_due_date,status FROM follow_up_tasks ORDER BY sequence_number")
        assert [row["status"] for row in followups] == ["INACTIVE", "INACTIVE", "INACTIVE"]
        assert len({row["planned_due_date"] for row in followups}) == 3
        company_id = db.one("SELECT id FROM companies")["id"]
        add_suppression(db, "owner@example.invalid", None, "test opt-out", "verify")
        apply_reply(db, "provider-test-reply", "unsubscribe", "unsubscribe", company_id=company_id)
        assert db.one("SELECT COUNT(*) AS n FROM follow_up_tasks WHERE status='CANCELLED'")["n"] == 3
        db.execute("INSERT INTO jobs(id,job_key,job_type,status,attempts,max_attempts,available_at,payload_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)", ("job-test", "job-test", "test", "FAILED", 1, 3, now_utc(), "{}", now_utc(), now_utc()))
        db.commit()
        assert retry_failures(db)["requeued"] == 1
        uncertain_id = db.one("SELECT id,idempotency_key FROM email_messages LIMIT 1")
        db.execute("UPDATE email_messages SET status='SENDING_UNCERTAIN' WHERE id=?", (uncertain_id["id"],))
        db.commit()
        unresolved = reconcile_uncertain_send(db, uncertain_id["idempotency_key"], "mock-provider")
        assert unresolved["status"] == "unresolved"
        reconciled = reconcile_uncertain_send(db, uncertain_id["idempotency_key"], "mock-provider", "mock-provider-message-1", "mock-provider-thread-1")
        assert reconciled["status"] == "reconciled"
        db.close()
        return {"status": "PASSED", "checks": ["discovery_to_crm", "audit_and_draft", "duplicate_prevention", "followup_due_dates", "suppression_and_reply_cancellation", "failed_job_requeue", "uncertain_send_reconciliation"]}


def schedule_task() -> dict[str, Any]:
    task_name = os.getenv("AGENCY_SCHEDULE_TASK_NAME", "MainStreetMediaAutomation")
    schedule_time = os.getenv("AGENCY_SCHEDULE_TIME", "09:00")
    source = BASE_DIR / "data" / "production_batch_20261029.json"
    wrapper = BASE_DIR / "run_scheduled.cmd"
    command = f'"{wrapper}"'
    result = subprocess.run(["schtasks", "/Create", "/TN", task_name, "/TR", command, "/SC", "DAILY", "/ST", schedule_time, "/F"], capture_output=True, text=True)
    verify_result = subprocess.run(["schtasks", "/Query", "/TN", task_name, "/FO", "LIST"], capture_output=True, text=True)
    return {"created": result.returncode == 0, "create_output": redact(result.stdout or result.stderr), "verified": verify_result.returncode == 0, "query_output": redact(verify_result.stdout or verify_result.stderr), "task_name": task_name, "command": command}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Main Street Media Co. durable lead-generation workflow")
    parser.add_argument("command", choices=["init", "run", "import-legacy", "status", "backup", "pause", "resume", "email-enable", "email-disable", "retry-failures", "export-csv", "verify", "schedule", "link-provider-draft", "reconcile-send", "reply", "suppress"])
    parser.add_argument("--input", type=Path, default=DATA_DIR / "production_batch_20261029.json")
    parser.add_argument("--db", type=Path, default=DB_PATH)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--idempotency-key")
    parser.add_argument("--provider", default="gmail_connector")
    parser.add_argument("--provider-message-id")
    parser.add_argument("--provider-thread-id")
    parser.add_argument("--provider-draft-id")
    parser.add_argument("--classification")
    parser.add_argument("--body-excerpt", default="")
    parser.add_argument("--company-id")
    parser.add_argument("--contact-id")
    parser.add_argument("--email")
    parser.add_argument("--domain")
    parser.add_argument("--reason", default="user-requested suppression")
    parser.add_argument("--source", default="manual")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    ensure_dirs()
    if args.command == "verify":
        print(json.dumps(verify(), indent=2))
        return 0
    if args.command == "schedule":
        print(json.dumps(schedule_task(), indent=2))
        return 0
    db = Database(args.db)
    db.migrate()
    try:
        if args.command == "init":
            campaign = ensure_campaign(db)
            set_setting(db, "global_pause", False)
            set_setting(db, "email_send_enabled", False)
            print(json.dumps({"status": "initialized", "database": str(args.db), "campaign_id": campaign}, indent=2))
        elif args.command == "run":
            db.close()
            print(json.dumps(run_pipeline(args.input, args.db, args.limit), indent=2))
        elif args.command == "import-legacy":
            db.close()
            print(json.dumps(import_legacy(args.input, args.db), indent=2))
        elif args.command == "status":
            print(json.dumps(status_report(db), indent=2, default=str))
        elif args.command == "backup":
            print(json.dumps({"backup": str(backup_database(db))}, indent=2))
        elif args.command == "pause":
            set_setting(db, "global_pause", True)
            print(json.dumps({"global_pause": True}, indent=2))
        elif args.command == "resume":
            set_setting(db, "global_pause", False)
            print(json.dumps({"global_pause": False}, indent=2))
        elif args.command == "email-enable":
            set_setting(db, "email_send_enabled", True)
            print(json.dumps({"email_send_enabled": True, "note": "Send code still requires campaign mode AUTHORIZED_SEND, explicit authorization, live thread checks, and a positive daily limit."}, indent=2))
        elif args.command == "email-disable":
            set_setting(db, "email_send_enabled", False)
            print(json.dumps({"email_send_enabled": False}, indent=2))
        elif args.command == "retry-failures":
            print(json.dumps(retry_failures(db), indent=2))
        elif args.command == "export-csv":
            print(json.dumps(export_csv(db, args.input), indent=2))
        elif args.command == "link-provider-draft":
            if not all((args.idempotency_key, args.provider_message_id)):
                raise ValueError("--idempotency-key and --provider-message-id are required")
            print(json.dumps(link_provider_draft(db, args.idempotency_key, args.provider, args.provider_message_id, args.provider_thread_id, args.provider_draft_id), indent=2))
        elif args.command == "reconcile-send":
            print(json.dumps(reconcile_uncertain_send(db, args.idempotency_key, args.provider, args.provider_message_id, args.provider_thread_id), indent=2))
        elif args.command == "reply":
            if not args.provider_message_id or not args.classification:
                raise ValueError("--provider-message-id and --classification are required")
            print(json.dumps(apply_reply(db, args.provider_message_id, args.classification, args.body_excerpt, args.company_id, args.contact_id), indent=2))
        elif args.command == "suppress":
            print(json.dumps(add_suppression(db, args.email, args.domain, args.reason, args.source), indent=2))
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())

