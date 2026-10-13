# Production launch blockers

The following client-owned inputs must be approved before the production
environment can be released. CI/release verification must treat any unchecked
item as blocking.

- [ ] Final production domain
- [ ] Client-owned and isolated Supabase, Vercel, Google OAuth, SMTP, DNS, and
      repository deployment controls pass the
      [hosted environment provisioning checklist](./operations/environment-provisioning.md)
- [x] Public support and privacy contact (contato@marquesbranding.com,
      WhatsApp (48) 99932-6846, published in the official documents)
- [x] Versioned Terms of Use approved by the legal owner (v1.0, 2026-10-01,
      Candeia & Leorato Advogados)
- [x] Versioned Privacy Policy approved by the legal owner (v1.0, 2026-10-01,
      Candeia & Leorato Advogados)
- [x] Consent wording for Terms, Privacy, and contact visibility
- [ ] LGPD data-subject export, correction, deletion/anonymization procedure;
      review and approve the
      [manual workflow baseline](./operations/data-subject-requests.md)
- [ ] Audit and operational data-retention decisions
- [ ] Marques Branding SMTP sender identity plus the complete
      [email delivery checklist](./operations/email-delivery.md), including
      SPF, DKIM, DMARC, rate limits, redirect isolation, and deliverability
- [ ] Initial administrator email(s)
- [ ] Final niche and company employee-range seed lists
- [ ] Final favicon or square brand mark derived and approved by the brand owner

The public legal routes `/terms` and `/privacy` publish the official v1.0
documents from `src/features/legal/content`. Each published version is
registered in `legal_documents` with a SHA-256 `content_hash`; a text change
requires a new version, a new migration, and a new acceptance
(`node --import tsx scripts/legal-hash.ts` prints the hashes).

Open items the official Privacy Policy already promises and that are still to
be delivered before launch:

- [ ] Cookie notice for Google Ads and Meta Pixel (Privacy Policy, chapter 11)
- [ ] In-platform account deletion and elimination within 120 days; refused
      registrations eliminated within 90 days (chapter 8)
- [ ] Confirm whether the home-page showcase needs its own consent checkbox
      (chapters 4 and 5.2 name consent as its legal basis)
