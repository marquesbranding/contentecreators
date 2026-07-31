# Incident response

Use this runbook for suspected security, privacy, availability, moderation,
email, provider, migration, or Storage incidents. Protect people and evidence
first; do not paste secrets or personal data into tickets or chat.

## Common first response

1. Assign an incident owner, severity, start time, affected stage, and safe
   request/deployment identifiers.
2. Stop the damaging action with the narrowest reversible control: revoke a
   credential/session, deactivate a placement, suspend access, stop a deploy,
   or disable a worker. Do not destroy evidence.
3. Preserve redacted logs, audit revisions, moderation events, deployment and
   migration IDs, and provider incident references.
4. Determine affected accounts/data/time range without exporting unnecessary
   personal data.
5. Notify the client/security/privacy owner through the approved channel.
6. Recover through reviewed credentials, compensating commands, rollback of
   application code, or corrective roll-forward migration.
7. Verify health, authorization, privacy boundaries, queues, and logs before
   closing. Record follow-up tests and preventive work.

## Scenario playbooks

### Auth credential or administrator compromise

- Revoke the affected Supabase sessions/identity and rotate only the exposed
  keys, OAuth secret, SMTP credential, or admin access.
- Check admin role/status/archive state, privileged audit activity,
  blocked-identity changes, moderation events, and outbox retries.
- Do not rotate publishable keys as a substitute for revoking a secret.
- Re-provision administrators through the audited runbook and force a
  verification of protected endpoints.

### Privacy or public-data exposure

- Remove the exposed route/creative/deployment from traffic and disable the
  narrow source of exposure.
- Preserve the response/deployment/request identifiers and identify the
  minimum affected fields/accounts.
- Check public social-proof configuration, DTO minimization, cache state,
  signed media, logs, and search metadata.
- Engage the client privacy/legal owner for notification and data-subject
  obligations. Do not make legal notification claims from this runbook.

### Wrong moderation decision

- Apply only an allowed compensating transition with a mandatory reason.
- Never edit/delete the original moderation event or audit revision.
- Verify catalog visibility, contact access, session/Auth effects, placement
  suppression, and email outbox consequences.
- If a ban was wrong, exceptional unban returns to suspended; restore requires
  a separate reviewed decision.

### SMTP outage

- Confirm provider status and configuration without logging credentials or
  recipients.
- Let the bounded outbox retry policy operate; stop repeated manual retries.
- Keep business transactions committed. After recovery, process eligible
  messages and inspect dead letters/duplicate protection.
- Verify SPF/DKIM/DMARC and deliverability before declaring recovery.

### BrasilAPI or other provider outage

- Keep company registration available through manual entry with a clear
  unavailable state.
- Confirm timeouts/rate limits and redacted telemetry; do not bypass CNPJ
  checksum or claim verification.
- Provider failure must not auto-approve or block a valid manual submission.

### Blocked migration/deploy

- Stop promotion. Do not change an applied migration or run manual dashboard
  DDL.
- Determine whether the application artifact has begun serving and follow the
  deployment runbook's rollback/roll-forward decision.
- Use a new corrective migration for schema defects, verify the ledger and
  target stage, then rerun pre/post-deploy checks.

### Private Storage leak

- Revoke/rotate affected signed access and correct the bucket/path policy.
- Preserve object/audit/request identifiers; identify exactly which objects
  were reachable and by whom.
- Verify both private buckets, cross-owner denial, replaced-object lifecycle,
  sponsorship references, and cache/CDN behavior.
- Rotate unrelated keys only if evidence shows they were exposed.

## Severity baseline

| Severity | Example                                                                                                          | Response                                                      |
| -------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Critical | Active secret/admin compromise or public participant/private-media exposure                                      | Immediate containment and client security/privacy escalation. |
| High     | Unauthorized protected access, incorrect ban affecting access, blocked production migration with partial release | Same-day containment, evidence, and controlled recovery.      |
| Medium   | SMTP/provider outage with safe fallback, isolated failed deployment                                              | Operational response and monitored recovery.                  |
| Low      | Cosmetic/degraded behavior without security, privacy, or data-integrity impact                                   | Normal defect flow with regression test.                      |

Closure requires root cause, impact window, evidence location, recovery proof,
credential status, data/legal review where applicable, and assigned preventive
actions. Secrets and raw personal data remain outside the incident record.
