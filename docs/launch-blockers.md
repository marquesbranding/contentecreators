# Production launch blockers

The following client-owned inputs must be approved before the production
environment can be released. CI/release verification must treat any unchecked
item as blocking.

- [ ] Final production domain
- [ ] Public support and privacy contact
- [ ] Versioned Terms of Use approved by the legal owner
- [ ] Versioned Privacy Policy approved by the legal owner
- [ ] Consent wording for Terms, Privacy, and contact visibility
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

The public legal routes intentionally show a preliminary notice and remain
`noindex` until their approved versioned documents and contact are supplied.
