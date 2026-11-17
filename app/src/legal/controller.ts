// The data controller's details (name, address, phone) appear in the worker privacy notice.
// The repository is PUBLIC, so they are never written into code or texts: the owner enters them once in
// Settings → Information, they are stored in the database (settings table), and the notice shows them via
// {controller_name} / {controller_address} / {controller_phone}.
import type { AppDB } from '../db/schema';

export interface Controller { name: string; address: string; phone: string }
const KEY = 'controller';
export const EMPTY_CONTROLLER: Controller = { name: '', address: '', phone: '' };

const clean = (c: Controller): Controller => ({ name: c.name.trim(), address: c.address.trim(), phone: c.phone.trim() });
export const isComplete = (c: Controller | undefined): c is Controller => !!c && !!(c.name.trim() && c.address.trim() && c.phone.trim());

export async function loadController(db: AppDB): Promise<Controller | undefined> {
  const row = await db.settings.get(KEY);
  return row ? (row.value as Controller) : undefined;
}

export async function saveController(db: AppDB, c: Controller): Promise<void> {
  await db.settings.put({ key: KEY, value: clean(c) });
}

/** The ONLY gate for inviting workers (M2 must call it): closed until name, address and phone are entered. */
export function canInviteWorkers(c: Controller | undefined): { allowed: boolean; reason?: 'controller_missing' } {
  return isComplete(c) ? { allowed: true } : { allowed: false, reason: 'controller_missing' };
}

export function assertCanInviteWorkers(c: Controller | undefined): void {
  if (!canInviteWorkers(c).allowed) throw new Error('controller_missing: enter the data controller details in Settings first');
}
