import { signal } from '@preact/signals';
import { AppDB, type FarmRow } from './schema';
import { importDemo, removeDemo, type PrototypeData } from './import-demo';
import { clearDemoGuide, seedDemoGuide } from './demo-guide';
import { migrateLegacyDb } from './legacy';
import { delLocal, guardAppendOnly, putLocal, refreshPending } from '../repo';
import { APP_NAME, DEMO_FARM_ID } from '../config';
import { t } from '../i18n';
import { commitAllHeld } from '../worker/held';
import { demoOrders, mapKey, migrateUnkeyedOrders, ordersKey, saveOrders } from '../orders/store';
import { parseHash, savedState, sheet, tab } from '../ui/nav';
import { dbBlocked, dirty, needRefresh } from '../pwa/update';

export const db = new AppDB();
guardAppendOnly(db);
// another tab with a NEWER version wants to upgrade the database: close ours (the update bar says so) / this tab waits for another tab to close
db.on('versionchange', () => { db.close(); needRefresh.value = true; setTimeout(() => { if (!dirty.value) location.reload(); }, 0); });   // a closed database is useless: reload at once unless something was typed (then the bar's button reloads)
db.on('blocked', () => { dbBlocked.value = 'other'; });

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
  await migrateUnkeyedOrders(db, real.id);
  hasDemo.value = !!(await db.farms.get(DEMO_FARM_ID));
  lastBackupAt.value = (await db.settings.get('last_backup_at'))?.value as string | undefined;
  await commitAllHeld(db).catch(() => undefined);      // a worker's action held when the phone was closed (T4)
  const where = parseHash(location.hash) ?? savedState((await db.settings.get('ui_state'))?.value);       // come back to the same farm and tab (T7)
  if (where) { tab.value = where.tab; if (where.farm === 'demo' && hasDemo.value) activeFarm.value = DEMO_FARM_ID; }
  const fromAddress = parseHash(location.hash);
  if (fromAddress?.sheet) sheet.value = fromAddress.sheet;      // a reload or a shared link comes back to the same detail sheet
  await refreshPending(db);
  // Ask the browser not to evict our data (iOS evicts storage of non-installed sites).
  try { await navigator.storage?.persist?.(); } catch { /* ignore */ }
  // Installed to the Home Screen for the first time: ask again (the answer can differ once the app is standalone).
  try { if (matchMedia('(display-mode: standalone)').matches && (await db.settings.get('persist_standalone')) === undefined) { await navigator.storage?.persist?.(); await putLocal(db, 'persist_standalone', true); } } catch { /* ignore */ }
}

export async function loadDemo() {
  const data = (await import('../../../reference/prototype/data.json')).default as unknown as PrototypeData;
  await importDemo(db, data);
  await clearDemoGuide(db); await seedDemoGuide(db);      // the two farmer cases (parsley, wild chicory): phone-local, Demo farm only
  const sample = demoOrders(Date.now()); await saveOrders(db, DEMO_FARM_ID, sample.orders, sample.map);      // a fictional order list, in the demo farm only
  hasDemo.value = true;
  activeFarm.value = DEMO_FARM_ID;
  dataVersion.value++;
}

export async function deleteDemo() {
  await removeDemo(db);
  await clearDemoGuide(db);
  await delLocal(db, ordersKey(DEMO_FARM_ID)); await delLocal(db, mapKey(DEMO_FARM_ID));      // the demo's order sample goes with it
  hasDemo.value = false;
  if (activeFarm.value === DEMO_FARM_ID) activeFarm.value = realFarmId.value;
  dataVersion.value++;
}

export const farmLabel = (id: string) => (id === DEMO_FARM_ID ? t('farm.demo') : t('farm.real'));
