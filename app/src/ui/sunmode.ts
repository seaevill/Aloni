import { effect, signal } from '@preact/signals';
import { db } from '../db';
import { putLocal } from '../repo';

// «Φως ημέρας» (Sun / Glove mode): pure black on white, bigger text and bigger tap targets for work in direct sunlight or with gloves. A look only: no feature, no rule, no data changes.
// Kept on THIS phone (a device-local setting, never synced, never in a backup) and works offline.
export const SUN_SETTING = 'ui_sun';
export const sunMode = signal(false);

export async function loadSun(): Promise<void> {
  sunMode.value = (await db.settings.get(SUN_SETTING))?.value === true;
}
export async function setSun(on: boolean): Promise<void> {
  sunMode.value = on;
  await putLocal(db, SUN_SETTING, on);
}
effect(() => { document.documentElement.toggleAttribute('data-sun', sunMode.value); });
