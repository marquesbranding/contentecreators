# Transactional email delivery

This runbook covers Supabase Auth email, application lifecycle email, and the
outbox fallback for local, development, and production. Marques Branding owns
the hosted SMTP account and DNS. Credentials and real recipient data must never
be committed.

## Delivery ownership

| Message family                               | Sender                           | Templates                                                                     | Local capture                              |
| -------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------ |
| Confirmation, recovery, invite, email change | Supabase Auth                    | `supabase/templates/*.html` locally; mirrored in each hosted Supabase project | Supabase inbox at `http://127.0.0.1:54324` |
| Onboarding and moderation lifecycle          | Next.js server-only SMTP adapter | `src/features/communications`                                                 | Mailpit at `http://127.0.0.1:8025`         |

Both hosted families use the approved Marques Branding SMTP authority, but
they have independent environment configuration and delivery telemetry.
Marketing email is outside the Beta scope.

## Environment matrix

| Stage       | Application origin                 | Supabase project        | Subject/sender rule                                                      | Redirect rule                           |
| ----------- | ---------------------------------- | ----------------------- | ------------------------------------------------------------------------ | --------------------------------------- |
| Local       | `http://localhost:3000`            | Supabase CLI            | Synthetic `.test` recipients only; Mailpit for application messages      | Exact `localhost`/`127.0.0.1` allowlist |
| Development | Client-approved development origin | `contente-creators-dev` | Dedicated non-production sender; prepend `[DEV]` to application subjects | Only the development origin             |
| Production  | Client-approved production origin  | `contente-creators-prd` | Approved production sender; no development prefix                        | Only the production origin              |

Never copy Auth users, SMTP credentials, message bodies, or redirect settings
between development and production.

## Supabase Auth template setup

Local Supabase loads the committed confirmation, recovery, invite, and email
change templates from `supabase/config.toml`. Hosted Supabase projects do not
automatically inherit those files.

For each hosted project:

1. Open **Authentication → Email Templates**.
2. Copy the matching subject and HTML from `supabase/templates/`.
3. Preserve only supported Supabase variables. Current templates use
   `{{ .ConfirmationURL }}` for the action and `{{ .SiteURL }}` for the
   environment-owned official logo; they do not render profile metadata.
4. Set the project **Site URL** to that stage's exact application origin.
5. Add only the stage's `/auth/callback` and `/reset-password` destinations to
   the redirect allowlist.
6. Send confirmation, recovery, invite, and email-change tests to an approved
   synthetic mailbox.
7. Confirm every link returns to the same environment and completes only once.
8. Disable provider link tracking or URL rewriting for Auth links.

Do not use a development callback in production or a wildcard preview URL.

## Marques Branding SMTP checklist

Complete this checklist separately for `contente-creators-dev` and
`contente-creators-prd`.

### Identity and transport

- [ ] Client approved the envelope sender, visible From address, reply-to
      behavior, and sender name.
- [ ] SMTP host, port, authenticated username, password, and TLS mode were
      supplied through the stage's secret store.
- [ ] Port `465` uses implicit TLS or port `587` uses STARTTLS according to the
      provider contract; certificate validation remains enabled.
- [ ] Supabase Auth custom SMTP and Vercel application SMTP use credentials
      intended for that stage.
- [ ] `CRON_SECRET` is unique per Vercel project and contains at least 32 random
      characters.

### DNS and reputation

- [ ] SPF authorizes the SMTP provider without creating more than one SPF TXT
      record.
- [ ] DKIM signing is enabled and the published selector validates.
- [ ] DMARC is present with a client-approved reporting mailbox and an initial
      policy appropriate to the verified rollout.
- [ ] From, return-path, and DKIM domains align as required by the approved
      DMARC policy.
- [ ] Auth/application transactional traffic is not mixed with an unrelated
      marketing list or sender reputation.

### Limits and safety

- [ ] Supabase Auth email rate limits and SMTP account hourly/daily limits are
      documented below the expected launch volume.
- [ ] Application timeout, concurrency, batch size, maximum attempts, and
      bounded backoff remain below the provider limits.
- [ ] Development can send only to approved test recipients and subjects are
      visibly marked `[DEV]`.
- [ ] Logs contain request IDs, template keys, result categories, and safe
      response codes only—never recipients, credentials, tokens, confirmation
      URLs, or full bodies.

### Deliverability acceptance

- [ ] Confirmation, recovery, admin invite, onboarding received, correction,
      approval, suspension, restoration, and ban messages render on narrow and
      desktop email clients.
- [ ] Plain-text fallbacks are readable and all visible copy was reviewed in
      Brazilian Portuguese.
- [ ] Links resolve to the correct origin and never cross environments.
- [ ] SPF, DKIM, and DMARC pass in received-message headers.
- [ ] A temporary SMTP outage leaves the business transition committed and one
      retryable outbox item.
- [ ] Concurrent worker calls create at most one successful delivery attempt.
- [ ] Maximum-attempt exhaustion is visible to an administrator and manual
      retry does not create a new message identity.
- [ ] Bounce/rejection categories are observable without storing provider
      bodies or recipient data in logs.

Record the verification date, operator, SMTP provider, sender identities,
limits, and evidence location in the client-owned release record. Do not paste
credentials or real message bodies into this repository.

## Scheduled fallback

Application messages are attempted immediately after their originating
transaction. Vercel's free Hobby cron interval is limited to once per day, so
`vercel.json` provides a daily safety-net run; it is not the primary delivery
path. The endpoint accepts only `Authorization: Bearer $CRON_SECRET`.

If the client later requires minute-level recovery, approve a paid schedule or
another reviewed free-tier-compatible scheduler before changing the interval.
Manual retry remains available only to a freshly authorized administrator and
is audited.

## Local acceptance

1. Run `npm run local:start`.
2. Register a synthetic email/password account and inspect the confirmation
   message at `http://127.0.0.1:54324`.
3. Complete confirmation and submit a profile.
4. Trigger each moderation transition with synthetic data.
5. Inspect application messages at `http://127.0.0.1:8025`.
6. Stop Mailpit, trigger a transition, and confirm the transition commits while
   the outbox remains retryable.
7. Restart Mailpit, process due items, and confirm exactly one successful
   attempt.
