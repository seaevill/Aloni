-- 0030_weather_schedule.sql  (WRITTEN, NOT APPLIED ANYWHERE)  The 6-hourly schedule of the weather function. A NEW file (0022–0029 are frozen for the team's review); builds on 0029.
--  * pg_cron calls the Edge Function `weather-fetch` at minute 7 of every 6th hour (00:07, 06:07, 12:07, 18:07 UTC). MET Norway only asks for a fresh answer when its «Expires» has passed, and the
--    function itself skips a parcel before that, so a more frequent run would change nothing.
--  * NO secret and no address is written here: the job reads two Vault secrets at RUN time, `weather_function_url` (https://<project>.supabase.co/functions/v1/weather-fetch) and
--    `weather_service_key` (the project's service key). Bora creates them once in the SQL Editor (RUNBOOK §14 step 4). Without them the job calls nothing.
--  * pg_cron, pg_net and Vault are Supabase extensions: where one of them is missing (a plain test database) this file only says so and creates no schedule. Nothing here is a table.
do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') or not exists (select 1 from pg_extension where extname = 'pg_net') or to_regclass('vault.decrypted_secrets') is null then
    raise notice '0030: pg_cron, pg_net or Vault is not enabled here: the weather schedule was NOT created (RUNBOOK §14)';
    return;
  end if;
  perform cron.schedule('weather-fetch', '7 */6 * * *', $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'weather_function_url'),
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'weather_service_key')),
      body := '{}'::jsonb)
    where exists (select 1 from vault.decrypted_secrets where name = 'weather_function_url') and exists (select 1 from vault.decrypted_secrets where name = 'weather_service_key')
  $job$);
end $$;
