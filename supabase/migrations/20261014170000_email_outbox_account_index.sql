begin;

-- email_outbox.account_id has a foreign key but no index. The account erasure
-- and account-scoped outbox queries would scan the whole outbox without it.
create index if not exists email_outbox_account_id_idx
  on public.email_outbox (account_id);

commit;
