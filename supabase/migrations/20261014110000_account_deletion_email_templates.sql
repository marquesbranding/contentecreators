-- New transactional templates for self-service account deletion. Kept in its own
-- migration because a new enum value cannot be used in the transaction that adds it.
alter type public.email_template add value if not exists 'ACCOUNT_DELETION_REQUESTED';
alter type public.email_template add value if not exists 'ACCOUNT_RECOVERED';
