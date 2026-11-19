-- Minimal stand-in for Supabase's auth schema, ONLY for the CI SQL check on a throwaway Postgres.
create schema if not exists auth;
create table if not exists auth.users(id uuid primary key default gen_random_uuid(), email text, email_confirmed_at timestamptz);   -- the two columns Supabase's auth.users has and 0019 reads
create or replace function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('test.jwt', true), ''), '{}')::jsonb $$;
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true),'')::uuid $$;

-- Roles as Supabase has them (a stub: NOT the real Supabase Auth; see docs/reviews/2026-11-18-migrations.md). Real auth.uid() reads the verified JWT claims.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;

-- Supabase lets anon/authenticated use the auth schema (auth.uid()) and the public schema.
grant usage on schema auth, public to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant execute on function auth.jwt() to anon, authenticated;

-- What Supabase does by default (a stub of it, not the real thing): every new object in `public` is open to anon / authenticated / service_role, TRUNCATE included.
-- RLS does NOT protect against TRUNCATE; migration 0015 takes it away explicitly.
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;

-- Minimal stand-in for Supabase Storage (tests only): the tables and the helper that migration 0028 uses. Real Supabase has the real ones.
create schema if not exists storage;
create table if not exists storage.buckets (id text primary key, name text not null, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
create table if not exists storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner uuid default auth.uid(), created_at timestamptz default now(), unique (bucket_id, name));
alter table storage.objects enable row level security;
create or replace function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)] $$;
grant usage on schema storage to anon, authenticated;
grant execute on function storage.foldername(text) to anon, authenticated;
grant select, insert, update, delete on storage.objects to anon, authenticated;
grant select on storage.buckets to anon, authenticated;
