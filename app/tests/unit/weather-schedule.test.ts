import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p: string): string => readFileSync(new URL(`../../../${p}`, import.meta.url), 'utf8');
describe('the weather schedule and the deploy workflow', () => {
  const sql = read('supabase/migrations/0030_weather_schedule.sql');
  it('0030 schedules the function every 6 hours from Vault secrets: no key, no address, no table in the file', () => {
    expect(sql).toContain("'weather-fetch', '7 */6 * * *'");
    expect(sql).toContain("name = 'weather_function_url'"); expect(sql).toContain("name = 'weather_service_key'");
    expect(sql).not.toMatch(/eyJ[A-Za-z0-9_-]{10,}|https:\/\/[a-z]{20}\.supabase\.co/);       // no JWT key, no project address
    expect(sql).not.toMatch(/create\s+table/i);
    expect(sql).toMatch(/pg_cron[\s\S]*return;/);                                              // missing extensions: a notice and nothing else
  });
  const wf = read('.github/workflows/weather-deploy.yml');
  it('the deploy workflow has the same three controls as the migrate one and cannot run by itself', () => {
    expect(wf).toMatch(/workflow_dispatch/); expect(wf).not.toMatch(/\n\s+(push|pull_request|schedule):/);
    expect(wf).toContain("github.ref == 'refs/heads/main'"); expect(wf).toContain('environment: supabase-production'); expect(wf).toContain('scripts/ci-gate.sh');
    expect(wf).toContain('DEPLOY'); expect(wf).toContain("inputs.mode == 'deploy'"); expect(wf).toContain('EXPECT_PROJECT_NAME: aloni');
    expect(wf).toContain('SUPABASE_CLI_VERSION: 2.122.1'); expect(read('.github/workflows/supabase-migrate.yml')).toContain('SUPABASE_CLI_VERSION: 2.122.1');
  });
  it('the function needs no secret of its own and never takes a key in the workflow', () => { expect(wf).not.toMatch(/OPEN_METEO|MET_API|secrets\.[A-Z_]*KEY/); });
});
