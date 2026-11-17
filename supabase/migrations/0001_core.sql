-- 0001_core.sql  (WRITTEN, NOT APPLIED ANYWHERE – see docs/milestones/M0.md)
-- Farms, members, shared helpers: server_seq, audit log, append-only guard, hash chain.
-- Conventions (TECH-SPEC §2): uuid PKs generated on the client; area in στρέμματα; tz Europe/Athens.
-- Safety rule: label data columns are NULLABLE. NULL = unknown/blocked, never a default.

create extension if not exists postgis;
create extension if not exists pgcrypto;

create sequence if not exists server_seq_seq;

create table farms (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  tz          text not null default 'Europe/Athens',
  lang        text not null default 'el' check (lang in ('el','tr','en')),
  is_demo     boolean not null default false,   -- Demo farm is fictional data, never mixed with real data
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  server_seq  bigint
);

create table profiles (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null,
  lang          text not null default 'el' check (lang in ('el','tr','en')),
  quiet_from    time not null default '21:00',
  quiet_to      time not null default '05:30',
  digest_time   time not null default '06:30',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table farm_members (
  farm_id     uuid not null references farms(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null check (role in ('owner','worker','agronomist')),  -- agronomist reserved, unused in Phase 1
  pin_hash    text,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  server_seq  bigint,
  primary key (farm_id, user_id)
);

-- ---------- helpers ----------

create or replace function has_role(p_farm uuid, p_roles text[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from farm_members m
    where m.farm_id = p_farm and m.user_id = auth.uid() and m.active and m.role = any (p_roles)
  );
$$;

create or replace function set_server_seq() returns trigger language plpgsql as $$
begin
  new.server_seq := nextval('server_seq_seq');
  if tg_op = 'UPDATE' and to_jsonb(new) ? 'updated_at' then new.updated_at := now(); end if;
  return new;
end $$;

-- ---------- audit log ----------

create table audit_log (
  id          bigint generated always as identity primary key,
  farm_id     uuid,
  table_name  text not null,
  row_id      text,
  op          text not null,
  old_row     jsonb,
  new_row     jsonb,
  by_user     uuid default auth.uid(),
  at          timestamptz not null default now()
);

create or replace function write_audit() returns trigger language plpgsql security definer set search_path = public as $$
declare r jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  insert into audit_log(farm_id, table_name, row_id, op, old_row, new_row)
  values (
    nullif(coalesce(r->>'farm_id', case when tg_table_name = 'farms' then r->>'id' end), '')::uuid,
    tg_table_name, coalesce(r->>'id', r->>'user_id'), tg_op,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );
  return null;
end $$;

-- Spray, harvest and stock records are append-only: corrections are amending rows.
create or replace function forbid_change() returns trigger language plpgsql as $$
begin
  raise exception '% is append-only; insert an amending row instead', tg_table_name using errcode = '42501';
end $$;

-- Per-farm tamper-evident hash chain (used by job_spray).
create or replace function chain_hash() returns trigger language plpgsql security definer set search_path = public as $$
declare prev text;
begin
  perform pg_advisory_xact_lock(hashtextextended(tg_table_name || new.farm_id::text, 0));
  execute format('select hash from %I where farm_id = $1 order by server_seq desc nulls last, created_at desc limit 1', tg_table_name)
    into prev using new.farm_id;
  new.prev_hash := prev;
  new.hash := encode(digest(coalesce(prev, '') || (to_jsonb(new) - 'hash' - 'prev_hash')::text, 'sha256'), 'hex');
  return new;
end $$;
