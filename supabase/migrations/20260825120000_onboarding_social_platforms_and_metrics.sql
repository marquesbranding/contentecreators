alter type public.social_platform add value if not exists 'THREADS';
alter type public.social_platform add value if not exists 'TELEGRAM';

alter table public.creator_metric_snapshots
  add column if not exists view_count bigint,
  add column if not exists interaction_count bigint,
  add column if not exists new_follower_count bigint,
  add column if not exists shared_content_description text;

alter table public.creator_metric_snapshots
  add constraint creator_metric_snapshots_view_count_check
    check (view_count is null or view_count >= 0),
  add constraint creator_metric_snapshots_interaction_count_check
    check (interaction_count is null or interaction_count >= 0),
  add constraint creator_metric_snapshots_new_follower_count_check
    check (new_follower_count is null or new_follower_count >= 0);
