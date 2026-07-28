create table public.rate_limit_buckets (
  scope varchar(64) not null,
  key_hash varchar(64) not null,
  window_started_at timestamptz not null,
  expires_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (scope, key_hash),
  constraint rate_limit_buckets_key_hash_format
    check (key_hash ~ '^[a-f0-9]{64}$')
);

alter table public.rate_limit_buckets enable row level security;

revoke all on table public.rate_limit_buckets from anon, authenticated;

create or replace function public.consume_rate_limit(
  target_scope text,
  target_key_hash text,
  target_limit integer,
  target_window_seconds integer
)
returns table (
  allowed boolean,
  remaining integer,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_time timestamptz := clock_timestamp();
  current_bucket public.rate_limit_buckets%rowtype;
begin
  if
    target_scope is null
    or target_scope !~ '^[a-z][a-z0-9_]{1,63}$'
    or target_key_hash !~ '^[a-f0-9]{64}$'
    or target_limit < 1
    or target_limit > 1000
    or target_window_seconds < 1
    or target_window_seconds > 86400
  then
    raise exception 'rate_limit_input_invalid';
  end if;

  insert into public.rate_limit_buckets (
    scope,
    key_hash,
    window_started_at,
    expires_at,
    request_count
  )
  values (
    target_scope,
    target_key_hash,
    current_time,
    current_time + make_interval(secs => target_window_seconds),
    1
  )
  on conflict (scope, key_hash) do nothing;

  select *
  into current_bucket
  from public.rate_limit_buckets
  where scope = target_scope
    and key_hash = target_key_hash
  for update;

  if current_bucket.expires_at <= current_time then
    update public.rate_limit_buckets
    set
      window_started_at = current_time,
      expires_at = current_time + make_interval(secs => target_window_seconds),
      request_count = 1
    where scope = target_scope
      and key_hash = target_key_hash
    returning * into current_bucket;

    return query
      select true, greatest(target_limit - 1, 0), target_window_seconds;
    return;
  end if;

  if current_bucket.request_count >= target_limit then
    return query
      select
        false,
        0,
        greatest(
          ceil(extract(epoch from current_bucket.expires_at - current_time))::integer,
          1
        );
    return;
  end if;

  update public.rate_limit_buckets
  set request_count = request_count + 1
  where scope = target_scope
    and key_hash = target_key_hash
  returning * into current_bucket;

  return query
    select
      true,
      greatest(target_limit - current_bucket.request_count, 0),
      greatest(
        ceil(extract(epoch from current_bucket.expires_at - current_time))::integer,
        1
      );
end;
$$;

revoke all on function public.consume_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, text, integer, integer)
  to service_role;

comment on table public.rate_limit_buckets is
  'Privacy-safe fixed-window counters. key_hash never stores a raw identity, email, IP, CNPJ, or token.';
