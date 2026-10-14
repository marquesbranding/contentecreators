begin;

-- Title and body stay optional and stored, but are shown on the creative only
-- when an explicit flag says so. Existing placements keep showing exactly what
-- they showed before: the flag starts true wherever the content exists.
alter table public.sponsorship_placements
  add column show_title boolean not null default false,
  add column show_body boolean not null default false;

-- Preserve versions/timestamps during the compatibility backfill; audit remains enabled.
alter table public.sponsorship_placements disable trigger sponsorship_placements_updated_at_version_trigger;
update public.sponsorship_placements
set
  show_title = title is not null,
  show_body = body is not null;
alter table public.sponsorship_placements enable trigger sponsorship_placements_updated_at_version_trigger;

alter table public.sponsorship_placements
  add constraint sponsorship_placements_show_title_check check (not show_title or title is not null),
  add constraint sponsorship_placements_show_body_check check (not show_body or body is not null);

commit;
