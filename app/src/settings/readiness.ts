import type { Controller } from '../legal/controller';
import { isComplete } from '../legal/controller';

// What must be true BEFORE sign-in and sync are switched on. The phone cannot see the server, so the migration and the Supabase Advisor check are confirmed by the owner (a recorded statement).
// This only LISTS what is missing. It never opens anything: the switch is a separate, deliberate step (RUNBOOK §12).
export const EXPECTED_MIGRATION = '0021';
export const READINESS_KEY = 'readiness';
export const BUSINESS_KEY = 'business';

export interface Confirmed { migration?: string; advisor?: boolean }
export interface Business { vat_id?: string; farm_name?: string }
export type ReadinessKey = 'controller' | 'farm_name' | 'vat' | 'migration' | 'advisor';
export interface ReadinessItem { key: ReadinessKey; ok: boolean }

export function readinessOf(input: { controller: Controller | undefined; business: Business | undefined; confirmed: Confirmed | undefined }): { items: ReadinessItem[]; ready: boolean } {
  const filled = (v: string | undefined): boolean => typeof v === 'string' && v.trim() !== '';
  const items: ReadinessItem[] = [
    { key: 'controller', ok: isComplete(input.controller) },
    { key: 'farm_name', ok: filled(input.business?.farm_name) },
    { key: 'vat', ok: filled(input.business?.vat_id) },
    { key: 'migration', ok: input.confirmed?.migration === EXPECTED_MIGRATION },   // confirmed for THIS version: a newer migration needs a new confirmation
    { key: 'advisor', ok: input.confirmed?.advisor === true },
  ];
  return { items, ready: items.every((i) => i.ok) };
}
