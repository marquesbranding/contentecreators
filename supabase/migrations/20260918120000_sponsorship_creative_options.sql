begin;

alter table public.sponsorship_placements
  add column link_on_creative boolean not null default false,
  add column show_sponsored_badge boolean not null default true,
  add column show_advertiser_label boolean not null default false,
  add column text_color varchar(7),
  add column button_background_color varchar(7),
  add column button_text_color varchar(7),
  add column font_family varchar(32),
  add column image_alt varchar(200);

alter table public.sponsorship_placements
  add constraint sponsorship_placements_text_color_check check (text_color is null or text_color ~ '^#[0-9A-Fa-f]{6}$'),
  add constraint sponsorship_placements_button_background_color_check check (button_background_color is null or button_background_color ~ '^#[0-9A-Fa-f]{6}$'),
  add constraint sponsorship_placements_button_text_color_check check (button_text_color is null or button_text_color ~ '^#[0-9A-Fa-f]{6}$'),
  add constraint sponsorship_placements_font_family_check check (font_family is null or font_family in ('default','serif','display','rounded','mono')),
  add constraint sponsorship_placements_link_on_creative_check check (not link_on_creative or link_url is not null),
  add constraint sponsorship_placements_advertiser_label_visible_check check (not show_advertiser_label or advertiser_label is not null);

-- Preserve versions/timestamps during compatibility backfill; audit remains enabled.
alter table public.sponsorship_placements disable trigger sponsorship_placements_updated_at_version_trigger;
update public.sponsorship_placements set link_on_creative = true where slot_key = 'catalog-midlist' and link_url is not null;
update public.sponsorship_placements set show_advertiser_label = true where advertiser_label is not null;
alter table public.sponsorship_placements enable trigger sponsorship_placements_updated_at_version_trigger;

commit;
