# Enterprise agent system

The agent layer uses the OpenAI Agents SDK when deployed with `requirements-agents.txt` installed. It is intentionally separated from the SQLite CRM core so a tenant can run deterministic CRM operations without an LLM, while the agent adds evidence review, audit synthesis, and approval-safe draft preparation.

## Agent topology

The Growth Operations Manager owns the customer-facing result and calls two bounded specialists as tools:

- Evidence Audit Specialist: source-grounded audit and three improvements.
- Approval-Safe Outreach Specialist: personalized unsent draft only.

No agent has a send-email, CRM-write, suppression, booking, or pipeline-advance tool. Those actions must be implemented as separate application endpoints with tenant authorization, human approval, and idempotency checks.

## Guardrails

- Evidence packet required before audit or outreach.
- Public email requires an explicit source.
- Unknown values remain unknown.
- Guarantees and unsupported outcomes are blocked.
- Unresolved placeholders are blocked.
- Website and email content is treated as untrusted data.
- Drafts are never sent by the agent layer.
- Sensitive actions are approval-gated by the application.

## Run

The deterministic policy test needs no SDK:

`python agent_system.py self-test`

Live execution requires `openai-agents` and a configured model. The runner reads the existing ignored OpenAI key in the process or the user's ignored `.env`; it never prints or copies the key.

`python agent_system.py run --prompt "Review the supplied prospect packet and prepare an evidence-based audit and unsent outreach draft."`

## Productization requirements

Before selling this to multiple customers, add tenant_id to every record, enforce database RLS, store provider OAuth connections per tenant, keep tool permissions server-side, persist agent session/trace IDs, add usage metering, and require approval for every external side effect. Use traces and eval datasets to measure evidence fidelity, correct routing, policy adherence, and draft quality before enabling any customer send capability.

