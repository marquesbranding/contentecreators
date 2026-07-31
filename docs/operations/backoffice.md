# Backoffice operating guide

Only a current, non-archived `ADMIN` account with `APPROVED` status may use the
backoffice. Shared credentials are prohibited. Every operator uses an
individual Supabase Auth identity so actions remain attributable.

## Review a submission

1. Open the moderation queue and filter by role/status if needed.
2. Open one submission. Confirm identity/profile data, media, completion,
   consent versions, CNPJ-assistance disclaimer, current version, and history.
3. Do not infer authenticity from CNPJ autocomplete. It is editable form
   assistance, not antifraud or automatic verification.
4. Choose exactly one action:
   - **Approve** only when the submitted version satisfies the reviewed rules.
   - **Request changes** with a concrete, respectful, actionable `pt-BR`
     reason explaining what must be corrected.
5. Confirm the action once. If the page reports a stale version, reload and
   review the new submission before deciding.
6. Check the audit timeline and outbox intent. A delivery failure does not
   undo the moderation decision.

Good correction wording names the field and the expected correction without
making unsupported accusations. Example: “Revise o endereço do perfil e
informe uma cidade e UF válidas.” Do not include passwords, tokens, full CNPJ,
unnecessary contact data, or provider payloads in reasons.

Bulk approval, bulk ban, and mass account mutation are intentionally absent in
the Beta.

## Approved-account operations

- **Edit profile**: use the account detail form. It uses the same validation,
  optimistic version, and audit pipeline as owner editing. Approval remains
  unchanged.
- **Suspend**: use for a reversible access restriction. Enter a specific
  reason; the profile disappears from catalogs immediately.
- **Restore**: only after the suspension reason is resolved. Record why access
  is safe to restore.
- **Ban**: use for a terminal known-identity restriction. Explain the
  consequence, confirm the current version, and verify the Auth effect.
- **Exceptional unban**: requires a new mandatory reason. It returns the
  account to suspended, not approved; perform a separate restore if warranted.
- **Archive**: soft-removes an account that must leave active operation while
  retaining required history. Never manipulate tables directly to simulate
  archive.

For a wrong decision, do not edit history. Apply the valid compensating
transition, document the reason, preserve the original event, and follow the
[incident-response runbook](./incident-response.md) when privacy or access was
affected.

## Sponsorship placements

1. Create/edit a placement with a reviewed type, audience, slot, safe URL,
   creative, schedule, and deterministic order.
2. Preview at narrow and desktop widths before activation.
3. Activate only within the approved schedule and audience.
4. Deactivate or archive obsolete content; do not hard-delete history.
5. Confirm referenced profiles are still eligible. The renderer suppresses
   ineligible participant references and all participant-derived public
   creative while public social proof is disabled.

Placements contain no pricing, payment, invoice, commission, or campaign
workflow in this Beta.

## Transactional e-mail

1. Open the outbox and filter pending/failed entries.
2. Inspect the safe attempt detail and failure classification.
3. Retry only an eligible terminal failure and only after the cause is
   understood.
4. Confirm the retry dialog once. Idempotency prevents a duplicate business
   message, but operators must still avoid repeated manual clicks.
5. Never paste recipient addresses, SMTP diagnostics, or provider responses
   into tickets. Use request IDs and redacted categories.

For a broad SMTP outage, stop manual retries and use the
[email-delivery](./email-delivery.md) and
[incident-response](./incident-response.md) procedures.

## Audit review

Use filters for entity, record, actor, action, source, and period. Treat the
revision view as immutable evidence:

- compare redacted before/after fields;
- correlate moderation event, request ID, actor, and outbox intent;
- investigate `SYSTEM_UNKNOWN`, unexpected privileged reads, repeated failed
  commands, or unexplained source changes;
- export evidence only through an approved incident or data-subject process;
- never change database rows to “fix” the audit history.

Admin provisioning/revocation follows
[admin provisioning](./admin-provisioning.md). Data-subject requests follow
[the manual LGPD workflow](./data-subject-requests.md).
