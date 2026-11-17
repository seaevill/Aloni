import { signal } from '@preact/signals';
import { AppDB } from './schema';
import { importDemo, removeDemo, type PrototypeData } from './import-demo';
import { APP_NAME, DEMO_FARM_ID, REAL_FARM_ID } from '../config';
import { t } from '../i18n';

export const db = new AppDB();

export const activeFarm = signal<string>(REAL_FARM_ID);
export const hasDemo = signal(false);
/** bumps after any data change so screens re-query */
export const dataVersion = signal(0);

export async function initDb() {
  if (!(await db.farms.get(REAL_FARM_ID))) {
    await db.farms.put({ id: REAL_FARM_ID, name: APP_NAME, isDemo: false });
  }
  hasDemo.value = !!(await db.farms.get(DEMO_FARM_ID));
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
  if (activeFarm.value === DEMO_FARM_ID) activeFarm.value = REAL_FARM_ID;
  dataVersion.value++;
}

export const farmLabel = (id: string) => (id === DEMO_FARM_ID ? t('farm.demo') : t('farm.real'));
