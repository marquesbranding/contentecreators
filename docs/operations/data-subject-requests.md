# Manual data-subject request workflow

Status: operational baseline awaiting client/legal approval.

This runbook defines the manual Beta workflow for a verified data subject or
authorized representative to request correction, a copy/export, or
deletion/anonymization of personal data. It is an execution and evidence
baseline, not legal advice, an approved retention policy, or permission to
operate against production by itself.

The matching procedure and retention decisions remain separate unchecked launch
gates in [`docs/launch-blockers.md`](../launch-blockers.md). The client/legal
owner must approve the final procedure, lawful constraints, subject-facing
wording, support/privacy channel, and data-class decisions before production.

## Non-negotiable controls

- All subject-facing acknowledgements and decisions are written in polished Brazilian Portuguese.
- Do not execute any request until the subject's identity and authority are verified.
- Use one opaque request identifier from intake through closure. Personal data
  must not appear in identifiers, log messages, ticket titles, filenames, or
  source-control artifacts.
- Grant operators only the access required for the approved action and target
  environment. Never use browser credentials, a public Supabase key, or a
  normal user's session for privileged fulfillment.
- Never include credentials, tokens, signed URLs, SMTP secrets, or another participant's personal data in an export.
- Immutable audit and moderation history is never edited or deleted ad hoc.
- Deletion or anonymization requires an explicit client/legal decision and approval reference for each retained, deleted, anonymized, or restricted data class.
- Prefer reversible restriction and a reviewed dry run until the approved
  decision explicitly authorizes an irreversible step.
- No automatic retention interval, deletion schedule, response deadline, or export-link lifetime is defined by this runbook.

## Request types

| Type                      | Intended outcome                                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Correction                | Correct inaccurate subject data at its source of truth while preserving immutable history and a new revision.   |
| Secure export             | Provide a minimized, subject-scoped copy through a verified delivery path without third-party or secret data.   |
| Deletion or anonymization | Apply the approved per-data-class decision to delete, anonymize, restrict, or retain the minimum justified set. |

A single case may contain more than one type, but each type keeps its own scope,
decision, approval, execution result, and evidence.

## Roles and separation

- **Request coordinator:** receives the request, assigns the request identifier,
  sends generic `pt-BR` acknowledgements, and maintains the restricted case
  record.
- **Identity verifier:** confirms that the requester controls the relevant
  identity or is an authorized representative. The verifier records only the
  verification method, outcome, and evidence reference.
- **Technical executor:** prepares the inventory and `DRY_RUN`, then performs
  only the approved `EXECUTE` plan through server-only, audited tooling.
- **Independent reviewer:** compares the inventory, plan, result, and evidence;
  verifies that third-party data and secrets are absent.
- **Client/legal owner:** decides restrictions and the disposition of each data
  class, supplies the approval reference, and approves subject-facing decisions.

The same person may cover operational roles in a small Beta team only when the
client-approved procedure allows it. Irreversible execution and export release
still require a recorded independent review.

## Workflow gates

Every gate is blocking. A request moves forward only when the preceding gate
has a recorded outcome in the restricted case record.

<!-- DSR-GATE:01-INTAKE -->

### Receive and register

1. Accept the request only through the client-approved privacy/support channel
   or an authenticated product channel. Do not move a request from a public
   social message into production operations without a controlled intake.
2. Create an opaque request identifier and restricted case record. Record the
   received timestamp, environment, request types, original communication
   evidence reference, coordinator, and current state.
3. Send a generic `pt-BR` acknowledgement that does not confirm whether an
   account exists. Never copy a full request or attachments into general
   chat, analytics, logs, or source control.
4. Keep the case at intake if the approved privacy contact is not configured;
   this is a production launch blocker, not permission to improvise a channel.

Account status does not remove a subject's ability to submit a request.
Suspended, banned, archived, and roleless identities follow the same verified
intake path without receiving product or catalog access.

<!-- DSR-GATE:02-VERIFY-IDENTITY -->

### Verify identity and authority

1. Prefer a freshly authenticated product session associated with the target
   account. Otherwise, use a client-approved challenge through the identity's
   verified Supabase email/provider channel.
2. For a representative, verify both the subject identity and the
   representative's authority using the minimum evidence required by the
   client/legal owner. Do not collect identity documents by default.
3. Never ask for a password, access token, refresh token, recovery link,
   one-time provider code, SMTP credential, or service-role key.
4. Record the method category, verifier, outcome, timestamp, and restricted
   evidence reference. Do not store the challenge secret or raw identity
   document in normal logs or audit snapshots.
5. If verification fails or remains ambiguous, stop. Return only a generic
   `pt-BR` explanation and disclose no account or profile data.

<!-- DSR-GATE:03-TRIAGE-AND-SCOPE -->

### Triage and define scope

1. Classify each requested outcome as correction, secure export, deletion, or
   anonymization. Clarify ambiguous wording through the verified channel.
2. Resolve the verified subject to internal identifiers without putting email,
   CNPJ, WhatsApp, provider identifiers, or profile text in the case title or
   operational log.
3. Build a data inventory across the systems actually used by the target
   environment:
   - Supabase Auth identities and provider metadata;
   - application accounts, creator/company profiles, locations, social
     profiles, metric snapshots, media metadata, and consents;
   - moderation cases/events, blocked identities, and audit revisions;
   - private Supabase Storage objects;
   - email outbox/attempt metadata;
   - Vercel/Supabase/application logs, caches, exports, and provider-held
     copies where applicable.
4. Mark fields containing another participant's data, administrator reasoning,
   security controls, secrets, or legally restricted material. Those fields
   require a separate inclusion/redaction decision.
5. Record missing systems or unknown data classes as blockers. Absence from the
   first inventory is not evidence that the data does not exist.

<!-- DSR-GATE:04-FULFILLMENT-PLAN -->

### Prepare the fulfillment plan

The executor produces a bounded `DRY_RUN` report containing only identifiers,
data-class counts, proposed actions, warnings, and a fingerprint of the plan.
It does not contain exported personal payloads. The report must be reproducible
against the same environment and request identifier before approval.

#### Correction

1. Identify the authoritative field and every derived presentation or cache.
2. Validate the new value through the same typed profile/account rules used by
   normal owner or authorized admin edits.
3. Plan the correction through an existing audited service or a reviewed,
   narrowly scoped migration. Never edit production tables through an ad hoc
   dashboard or rewrite a prior revision.
4. Create a new corrective revision with actor, request identifier, source,
   reason, and changed fields. Preserve the original immutable history.
5. Include dependent cache invalidation, signed-media replacement, provider
   update, and verification steps where relevant.

#### Secure export

1. Map each approved data class to a documented export field. Use safe DTOs,
   not raw table, Auth provider, audit snapshot, or SMTP payload serialization.
2. Redact or omit third-party personal data, internal security details,
   restricted administrator reasoning, credentials, tokens, signed URLs,
   secrets, raw provider payloads, and unnecessary message bodies.
3. Use a documented machine-readable format plus a `pt-BR` explanation of
   categories, sources, redactions, and any data not included.
4. Generate the package only after approval, in restricted temporary storage.
   Encrypt it or use a client-approved protected delivery mechanism. Never
   attach it to a normal ticket or unrestricted email.
5. Record a package fingerprint, schema/version, item counts, generator
   version, reviewer, delivery mechanism, and evidence reference without
   retaining the package in the evidence register.

#### Deletion or anonymization

1. Produce a decision matrix for every inventoried data class with exactly one
   proposed disposition: `DELETE`, `ANONYMIZE`, `RESTRICT_AND_RETAIN`, or
   `NO_DATA_FOUND`.
2. For retained data, record the approved purpose, access restriction, policy
   or legal reference, and later review trigger supplied by the client/legal
   owner. Do not infer a period.
3. Treat these classes explicitly:
   - operational account and profile data;
   - Auth identity/provider data;
   - private Storage media and archived replacements;
   - consent evidence;
   - moderation and append-only audit history;
   - blocked-identity protection for a known banned identity;
   - outbox recipient/payload and attempt metadata;
   - logs, caches, previously generated exports, provider copies, and backup
     restore procedures.
4. Do not hard-delete business rows merely to make the account disappear from
   normal screens. Soft archive/restriction is the normal operational action;
   hard deletion or anonymization requires the separately approved procedure.
5. For immutable history, never perform a direct update/delete. The plan must
   use a separately authorized, policy-driven and itself auditable
   anonymization operation, or retain the minimum restricted record under an
   explicit client/legal decision.
6. Define referential-integrity, restore/replay, cache invalidation, Storage,
   Auth, and external-provider consequences before approval. A future restore
   must not silently reintroduce data already approved for deletion or
   anonymization.

<!-- DSR-GATE:05-APPROVAL -->

### Approve the plan

The client/legal owner and independent reviewer record approval only when:

- identity and representative authority are verified;
- the request types and target environment are unambiguous;
- the system inventory and third-party data review are complete;
- each export field or data-class disposition is explicit;
- restrictions, redactions, minimum retained evidence, and provider actions
  are documented;
- the `DRY_RUN` fingerprint and bounded counts match the reviewed plan;
- the technical executor, independent reviewer, and client/legal approver are
  identified;
- an immutable approval reference and approved subject-facing decision wording
  exist.

Missing retention or anonymization decisions keep affected actions blocked.
Approval of one request type does not authorize another, and development
approval does not authorize production execution.

<!-- DSR-GATE:06-EXECUTION -->

### Execute the approved action

1. Reconfirm the exact Supabase/Vercel environment and approved plan
   fingerprint immediately before execution.
2. Execute through reviewed server-only tooling with least privilege, a safe
   request identifier, verified actor context, explicit source, and approval
   reference. Use `EXECUTE` only after the approved `DRY_RUN`.
3. Prefer bounded transactions or idempotent batches. Stop on a plan mismatch,
   stale version, unexpected count, missing provider access, or partial
   failure; do not broaden scope to “finish” the request.
4. Store counts, result categories, affected internal identifiers, audit
   revision/event references, tool version, and safe provider result categories.
   Do not log subject fields, object paths, export payloads, credentials, or
   provider response bodies.
5. Place every incomplete provider or restore action in the restricted case
   record and leave the request open.

<!-- DSR-GATE:07-VERIFICATION -->

### Verify the result

The independent reviewer:

- reruns the bounded inventory and compares it with the approved plan and
  execution result;
- verifies corrected values through authorized DTOs and confirms prior
  immutable revisions were preserved;
- validates the export schema, redactions, package fingerprint, item counts,
  encryption/protection, and absence of other participants' data;
- verifies deletion/anonymization or restriction in Postgres, Supabase Auth,
  Storage, caches, providers, and the documented restore path as applicable;
- confirms the action itself has an immutable audit/evidence reference;
- performs a negative access check so archived, deleted, or restricted data is
  not exposed through public, product, catalog, backoffice, or media paths;
- records deviations as blockers rather than silently editing the evidence.

<!-- DSR-GATE:08-DELIVERY-AND-CLOSURE -->

### Deliver and close

1. Send the result only through the verified, client-approved channel. If a
   protected export link is used, its lifetime and revocation behavior must
   come from the approved policy; without that decision, use a controlled
   handoff and manually revoke access after confirmed receipt.
2. Provide a clear `pt-BR` outcome for every requested type, including
   completed corrections, export contents/redactions, deleted/anonymized
   classes, restricted retained classes, and the approved reason for any
   limitation.
3. Confirm delivery or receipt without copying the export payload into the case
   record. Revoke temporary access and remove temporary working copies through
   the approved procedure.
4. Close only after all verification checks, provider actions, approvals,
   evidence references, and subject communications are complete. A failed
   delivery or incomplete action keeps the case open for controlled recovery.

## Evidence register

The restricted evidence register contains:

- opaque request identifier, request types, environment, states, and
  timestamps;
- coordinator, verifier, executor, reviewer, and client/legal approver
  identities;
- identity/authority verification method category, outcome, and evidence
  reference;
- inventory version, data-class counts, scope decisions, redaction decisions,
  and provider coverage;
- `DRY_RUN` and `EXECUTE` fingerprints, tool/version, approval reference, safe
  result categories, and affected internal identifiers;
- audit revision/moderation/event references and safe provider action
  references;
- export schema and package fingerprint, never the export contents;
- verification checklist, deviations, subject-facing communication reference,
  delivery confirmation, revocation/removal evidence, and closure decision.

Evidence is access-restricted and data-minimized. It must not duplicate the
subject's full profile, export archive, identity document, communication body,
credentials, tokens, signed links, secrets, or another participant's data.

## Failure and escalation rules

- Stop on identity ambiguity, environment mismatch, stale data, unexpected
  counts, missing approval, missing retention/anonymization decision, provider
  uncertainty, or evidence mismatch.
- Do not retry an irreversible action by hand. Rebuild the inventory and
  `DRY_RUN`, record the incident, and obtain a reviewed recovery plan.
- Escalate suspected unauthorized disclosure or wrong-subject fulfillment
  through the client-approved incident procedure; preserve safe evidence and do
  not conceal or overwrite the event.
- Do not promise a deadline or disposition that has not been approved by the
  client/legal owner.

## Automated validation

Run the focused documentation contract with:

```bash
npm run test:unit -- --run src/features/audit/domain/data-subject-request-workflow.unit.test.ts
```

The contract verifies the ordered gates, safety statements, launch-blocker
links, and absence of invented numeric retention, response, or delivery
intervals.
