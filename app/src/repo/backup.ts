// JSON backup and restore of the REAL farm (never the demo farm). The backup is a plain file Bora keeps; restoring it is idempotent
// (same UUIDs = same records) and all-or-nothing. Photos travel inside as base64 with their SHA-256 and are checked on restore.
import { DEMO_FARM_ID } from '../config';
import { FARM_TABLES, type AppDB, type Row } from '../db/schema';
import { base64ToBlob, blobToBase64, sha256Hex } from '../db/sha256';
import { actorId, deviceId, isAppendOnly, put, putLocal, refreshPending } from '.';

export const BACKUP_FORMAT = 'aloni-backup';
export const BACKUP_VERSION = 1;
const DEVICE_ONLY = new Set(['device_id', 'actor_id', 'last_backup_at']); // never part of a backup
export type BackupErrorCode = 'format' | 'version' | 'sha256' | 'demo' | 'conflict';
export class BackupError extends Error { constructor(readonly code: BackupErrorCode) { super(code); } }

interface MediaEntry { id: string; farm_id: string; sha256: string; mime: string; width: number; height: number; bytes: number; created_at: string; data_base64: string }
export interface Backup {
  format: typeof BACKUP_FORMAT; version: number; created_at: string; app_version: string; device_id: string;
  farm: { id: string; name: string };
  tables: Record<string, Row[]>; settings: Array<{ key: string; value: unknown }>; media: MediaEntry[];
}

export async function makeBackup(db: AppDB, farm: { id: string; name: string }, appVersion: string): Promise<Backup> {
  const tables: Record<string, Row[]> = {};
  for (const t of FARM_TABLES) tables[t] = await db[t].where('farm_id').equals(farm.id).toArray();
  const settings = (await db.settings.toArray()).filter((s) => !DEVICE_ONLY.has(s.key));
  const media: MediaEntry[] = [];
  for (const m of await db.media.where('farm_id').equals(farm.id).toArray()) {
    media.push({ id: m.id, farm_id: m.farm_id, sha256: m.sha256, mime: m.mime, width: m.width, height: m.height, bytes: m.bytes, created_at: m.created_at, data_base64: await blobToBase64(new Blob([m.data], { type: m.mime })) });
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

/** Restores into the real farm: same farm id, or an empty phone (then the backup's farm id is adopted). Anything else is refused. */
export async function restoreBackup(db: AppDB, backup: Backup, localFarmId: string, appActor = actorId): Promise<{ rows: number; farmId: string }> {
  const photos: Array<{ meta: Omit<MediaEntry, 'data_base64'>; data: ArrayBuffer }> = [];
  for (const { data_base64, ...meta } of backup.media) { // verify EVERY photo before writing anything (and read the bytes now: awaiting inside a Dexie transaction would end it)
    const blob = base64ToBlob(data_base64, meta.mime);
    if ((await sha256Hex(blob)) !== meta.sha256) throw new BackupError('sha256');
    photos.push({ meta, data: await blob.arrayBuffer() });
  }
  const localRows = (await Promise.all(FARM_TABLES.map((t) => db[t].where('farm_id').equals(localFarmId).count()))).reduce((a, b) => a + b, 0);
  if (backup.farm.id !== localFarmId && localRows > 0) throw new BackupError('conflict');
  await appActor(db);
  let rows = 0;
  await db.transaction('rw', db.tables, async () => {
    if (backup.farm.id !== localFarmId) { await db.farms.delete(localFarmId); await db.farms.put({ id: backup.farm.id, name: backup.farm.name, is_demo: false }); }
    for (const [table, list] of Object.entries(backup.tables)) {
      for (const r of list) {
        if (isAppendOnly(table)) { if (!(await db.table(table).get(r.id))) await put(db, table, r, 'insert'); } else await put(db, table, r); // ledger rows: one already here is left alone
        rows += 1;
      }
    }
    for (const s of backup.settings) { if (!(await db.settings.get(s.key))) await db.settings.put(s); }
    for (const { meta, data } of photos) { // photos are append-only: one that is already here (same id) is left alone, a new one is queued for the server
      if (!(await db.media.get(meta.id))) await put(db, 'media', { ...meta, data }, 'insert');
    }
  });
  await refreshPending(db);
  return { rows, farmId: backup.farm.id };
}

export const markBackupDone = (db: AppDB, atIso: string) => putLocal(db, 'last_backup_at', atIso);
