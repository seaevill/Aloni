-- 0020_label_rules.sql  (WRITTEN, NOT APPLIED ANYWHERE)  Findings of the team's 0019 review (m3-0019). A NEW file; builds on 0001–0019.
--  b  the unique key (product, crop, target) counted ARCHIVED label uses too: a superseded (archived) label blocked its own replacement. Only ACTIVE rows count now;
--  c  once a spray has used a label use, its safety values (product, crop, dose, unit, PHI, REI, max applications) are FROZEN even while it is unsigned: they could be lowered and then
--     signed. A change is a new label use (supersedes_id + change_reason), as for a signed one. Signing the values as they are, and archiving, stay possible;
--  d  the role service_role has NO access to the schema `private` ON PURPOSE (documented below): triggers and RLS run helpers with definer or caller rights, and nothing server-side that
--     uses service_role needs them; an Edge Function that must read them has to be given an explicit, reviewed grant.
alter table label_uses drop constraint label_uses_product_id_crop_id_target_key;
create unique index label_uses_active_key on label_uses (product_id, crop_id, target) where deleted_at is null;

create function forbid_used_label_change() returns trigger language plpgsql set search_path = public, private as $$
begin
  if old.sign_off_by is not null then return new; end if;     -- a signed label is already immutable (forbid_signed_label_change)
  if (new.product_id, new.crop_id, new.dose_kind, new.dose_unit, new.dose_min, new.dose_max, new.phi_days, new.rei_hours, new.max_apps, new.dose_min_not_on_label, new.dose_max_not_on_label, new.phi_days_not_on_label, new.rei_hours_not_on_label, new.max_apps_not_on_label)
     is distinct from (old.product_id, old.crop_id, old.dose_kind, old.dose_unit, old.dose_min, old.dose_max, old.phi_days, old.rei_hours, old.max_apps, old.dose_min_not_on_label, old.dose_max_not_on_label, old.phi_days_not_on_label, old.rei_hours_not_on_label, old.max_apps_not_on_label)
     and exists (select 1 from job_spray s where s.label_use_id = old.id) then
    raise exception 'a label use that a spray has already used cannot change its values: add a NEW label use (supersedes_id + change_reason) instead' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger label_uses_used_guard before update on label_uses for each row execute function forbid_used_label_change();
revoke execute on function forbid_used_label_change() from public, anon, authenticated;
comment on schema private is 'RLS and trigger helpers. NOT exposed by the API. service_role has no access on purpose (see 0020); grant it explicitly, after review, if an Edge Function ever needs a helper.';
