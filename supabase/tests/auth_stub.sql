-- Minimal stand-in for Supabase's auth schema, ONLY for the CI SQL check on a throwaway Postgres.
create schema if not exists auth;
create table if not exists auth.users(id uuid primary key default gen_random_uuid());
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true),'')::uuid $$;

-- Roles as Supabase has them (a stub: NOT the real Supabase Auth; see docs/reviews/2026-11-18-migrations.md). Real auth.uid() reads the verified JWT claims.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
