# Known blocked identities

The MVP blocks known identity keys; it does not attempt to identify a person
behind a new account.

## Covered defenses

- Active `blocked_identities` rows store SHA-256 hashes, never plain email or
  provider subject values.
- The Supabase `Before User Created` hook checks normalized email hashes for the
  incoming `EMAIL` or `GOOGLE` provider.
- Google checks also compare the stable provider subject hash when the hook
  payload supplies it, so changing the Google email does not bypass a known
  subject block.
- The hook returns one generic `pt-BR` error and does not reveal whether an
  email, provider subject, or other record matched.
- After authentication, a `BANNED` application account is denied, signed out,
  globally revoked where Supabase accepts the access token, and administratively
  banned in Supabase Auth.
- Product authorization remains status-aware even if an external revocation
  call is temporarily unavailable.

## Explicit MVP limitation

A different email and a different provider subject are an unknown identity.
They pass the pre-creation hook unless they independently appear in
`blocked_identities`. Correlating people through device fingerprinting, document
verification, behavioral signals, network correlation, or third-party identity
verification would be automated antifraud and is explicitly outside the Beta
scope.

The integration suite contains an acceptance test for this limitation so a
future implementation cannot silently claim person-level blocking without a new
approved requirement, privacy assessment, and legal basis.
