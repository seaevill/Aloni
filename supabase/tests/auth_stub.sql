-- Minimal stand-in for Supabase's auth schema, ONLY for the CI SQL check on a throwaway Postgres.
create schema if not exists auth;
create table if not exists auth.users(id uuid primary key default gen_random_uuid());
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true),'')::uuid $$;
