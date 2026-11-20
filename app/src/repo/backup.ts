// JSON backup and restore of the REAL farm (never the demo farm). The backup is a plain file Bora keeps; restoring it is idempotent
// (same UUIDs = same records) and all-or-nothing. Photos travel inside as base64 with their SHA-256 and are checked on restore.
import { DEMO_FARM_ID } from '../config';
import { FARM_TABLES, type AppDB, type Row } from '../db/schema';
import { base64ToBlob, blobToBase64, sha256Hex } from '../db/sha256';
import { actorId, deviceId, isAppendOnly, put, putLocal, putSetting, refreshPending } from '.';

export const BACKUP_FORMAT = 'aloni-backup';
export const BACKUP_VERSION = 1;
const DEVICE_ONLY = new Set(['device_id', 'actor_id', 'last_backup_at', 'auth_session', 'worker_view', 'sync_enabled', 'push_subscription', 'persist_standalone']); // never part of a backup (the sign-in session holds tokens: it must NEVER leave the phone in a file)
export const isDeviceOnlyKey = (key: string): boolean => DEVICE_ONLY.has(key) || key.startsWith('sync_cursor:') || key.startsWith('held_action:') || key.startsWith('media_up:');
export type BackupErrorCode = 'format' | 'version' | 'sha256' | 'demo' | 'conflict';
export class BackupError extends Error { constructor(readonly code: BackupErrorCode) { super(code); } }

interface MediaEntry { id: string; farm_id: string; sha256: string; mime: string; width: number; height: number; bytes: number; created_at: string; device_id?: string; actor_id?: string; data_base64: string }
export interface Backup {
  format: typeof BACKUP_FORMAT; version: number; created_at: string; app_version: string; device_id: string;
  farm: { id: string; name: string };
  tables: Record<string, Row[]>; settings: Array<{ key: string; value: unknown }>; media: MediaEntry[];
}

export async function makeBackup(db: AppDB, farm: { id: string; name: string }, appVersion: string): Promise<Backup> {
  const tables: Record<string, Row[]> = {};
  for (const t of FARM_TABLES) tables[t] = await db[t].where('farm_id').equals(farm.id).toArray();
  const settings = (await db.settings.toArray()).filter((s) => !isDeviceOnlyKey(s.key));
  const media: MediaEntry[] = [];
  for (const { data, ...meta } of await db.media.where('farm_id').equals(farm.id).toArray()) {
    media.push({ ...meta, data_base64: await blobToBase64(new Blob([data], { type: meta.mime })) });
  }
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, created_at: new Date().toISOString(), app_version: appVersion, device_id: await deviceId(db), farm, tables, settings, media };
}

export function parseBackup(text: string): Backup {
  let b: Backup;
  try { b = JSON.parse(text) as Backup; } catch { throw new BackupError('format'); }
  if (b?.format !== BACKUP_FORMAT || typeof b.farm?.id !== 'string' || !b.tables || !Array.isArray(b.media) || !Array.isArray(b.settings)) throw new BackupError('format');
  if (b.version !== BACKUP_VERSION) throw new BackupError('version');
  const all = Object.values(b.tables).flat();
  if (b.farm.id === DEMO_FARM_ID || all.some((r) => r.farm_id === DEMO_FARM_ID) || b.media.some((m) => m.farm_id === DEMO_FARM_ID)) throw new BackupError('demo');
  if (all.some((r) => typeof r.id !== 'string' || r.farm_id !== b.farm.id)) throw new BackupError('format');
  return b;
}

export interface Skipped { table: string; id: string; label: string }
export interface Restored { rows: number; added: number; updated: number; same: number; farmId: string; skipped: Skipped[] }

const stable = (v: unknown): string => JSON.stringify(v, (_k, x: unknown) => (x && typeof x === 'object' && !Array.isArray(x) && !(x instanceof ArrayBuffer) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x));
const stampOf = (r: Row): string => String(r.updated_at ?? r.created_at ?? '');
const labelOf = (r: Row): string => String(r.name ?? r.batch ?? r.sampled_on ?? r.id);

/**
 * Restores into the real farm: same farm id, or an empty phone (then the backup's farm id is adopted). Anything else is refused.
 * NEVER overwrites newer data: a record that is already here and not older than the backup's copy is left alone and listed in `skipped`
 * (so it is also not queued for the server). Records keep their original actor_id / device_id.
 */
export async function restoreBackup(db: AppDB, backup: Backup, localFarmId: string, appActor = actorId): Promise<Restored> {
  const photos: Array<{ meta: Omit<MediaEntry, 'data_base64'>; data: ArrayBuffer }> = [];
  for (const { data_base64, ...meta } of backup.media) { // verify EVERY photo before writing anything (and read the bytes now: awaiting inside a Dexie transaction would end it)
    const blob = base64ToBlob(data_base64, meta.mime);
    if ((await sha256Hex(blob)) !== meta.sha256) throw new BackupError('sha256');
    photos.push({ meta, data: await blob.arrayBuffer() });
  }
  const counts = await Promise.all([...FARM_TABLES.map((t) => db[t].where('farm_id').equals(localFarmId).count()), db.media.where('farm_id').equals(localFarmId).count()]);
  if (backup.farm.id !== localFarmId && counts.some((n) => n > 0)) throw new BackupError('conflict'); // photos count too: they must not be left under a farm id that is about to disappear
  await appActor(db);
  const origin = { device_id: backup.device_id };
  const skipped: Skipped[] = [];
  let rows = 0; let added = 0; let updated = 0; let same = 0;
  await db.transaction('rw', db.tables, async () => {
    if (backup.farm.id !== localFarmId) {
      const mine = (await db.settings.toArray()).filter((s) => !isDeviceOnlyKey(s.key));
      await db.farms.delete(localFarmId);
      await db.outbox.where('farm_id').equals(localFarmId).delete(); // nothing may stay queued under the farm id that is gone...
      await db.farms.put({ id: backup.farm.id, name: backup.farm.name, is_demo: false });
      for (const s of mine) await putSetting(db, backup.farm.id, s.key, s.value); // ...so this phone's own settings are queued again under the new one
    }
    for (const [table, list] of Object.entries(backup.tables)) {
      for (const r of list) {
        const local = await db.table<Row>(table).get(r.id);
        if (local && stable(local) === stable(r)) { same += 1; continue; }
        if (local && (isAppendOnly(table) || stampOf(r) <= stampOf(local))) { skipped.push({ table, id: r.id, label: labelOf(local) }); continue; }
        await put(db, table, r, isAppendOnly(table) ? 'insert' : 'update', origin);
        rows += 1;
        if (local) updated += 1; else added += 1;
      }
    }
    for (const s of backup.settings) {
      const local = await db.settings.get(s.key);
      if (!local) await db.settings.put(s);
      else if (stable(local.value) !== stable(s.value)) skipped.push({ table: 'settings', id: s.key, label: s.key });
    }
    for (const { meta, data } of photos) { // photos are append-only: one that is already here is left alone, a new one is queued for the server
      const local = await db.media.get(meta.id);
      if (!local) await put(db, 'media', { ...meta, data }, 'insert', origin);
      else if (local.sha256 !== meta.sha256) skipped.push({ table: 'media', id: meta.id, label: meta.id });
    }
  });
  await refreshPending(db);
  return { rows, added, updated, same, farmId: backup.farm.id, skipped };
}

export const markBackupDone = (db: AppDB, atIso: string) => putLocal(db, 'last_backup_at', atIso);
