import { signal } from '@preact/signals';
import { AppDB, type FarmRow } from './schema';
import { importDemo, removeDemo, type PrototypeData } from './import-demo';
import { migrateLegacyDb } from './legacy';
import { guardAppendOnly, refreshPending } from '../repo';
import { APP_NAME, DEMO_FARM_ID } from '../config';
import { t } from '../i18n';

export const db = new AppDB();
guardAppendOnly(db);

export const realFarmId = signal('');
export const activeFarm = signal('');
export const hasDemo = signal(false);
/** true when an old database holding real rows was found and kept (not deleted) */
export const legacyKept = signal(false);
/** bumps after any data change so screens re-query */
export const dataVersion = signal(0);
/** when the last backup file was made (device-local setting) */
export const lastBackupAt = signal<string | undefined>(undefined);

export async function initDb() {
  legacyKept.value = (await migrateLegacyDb(db)).status === 'kept';
  const real: FarmRow = (await db.farms.filter((f) => !f.is_demo).first()) ?? { id: crypto.randomUUID(), name: APP_NAME, is_demo: false };
  await db.farms.put(real);
  realFarmId.value = real.id;
  activeFarm.value = real.id;
  hasDemo.value = !!(await db.farms.get(DEMO_FARM_ID));
  lastBackupAt.value = (await db.settings.get('last_backup_at'))?.value as string | undefined;
  await refreshPending(db);
  // Ask the browser not to evict our data (iOS evicts storage of non-installed sites).
  try { await navigator.storage?.persist?.(); } catch { /* ignore */ }
}

export async function loadDemo() {
  const data = (await import('../../../reference/prototype/data.json')).default as unknown as PrototypeData;
  await importDemo(db, data);
  hasDemo.value = true;
  activeFarm.value = DEMO_FARM_ID;
  dataVersion.value++;
}

export async function deleteDemo() {
  await removeDemo(db);
  hasDemo.value = false;
  if (activeFarm.value === DEMO_FARM_ID) activeFarm.value = realFarmId.value;
  dataVersion.value++;
}

export const farmLabel = (id: string) => (id === DEMO_FARM_ID ? t('farm.demo') : t('farm.real'));
