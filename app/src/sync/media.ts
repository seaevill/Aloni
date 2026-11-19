import type { AppDB, MediaRow } from '../db/schema';
import { putLocal } from '../repo';

// Photos go up AFTER the records, one at a time or with a small fixed parallelism, in the order they were taken, and exactly as stored (never shrunk again: they were processed once
// when they were added). A photo that went up is remembered on this phone (`media_up:<id>`), so an interrupted upload continues where it stopped and never sends one twice.
export type MediaPut = (m: { id: string; sha256: string; mime: string; bytes: ArrayBuffer }) => Promise<void>;
const KEY = (id: string): string => `media_up:${id}`;

export async function uploadMedia(db: AppDB, put: MediaPut, farmId: string, parallel: number): Promise<{ uploaded: number; left: number }> {
  const all = (await db.media.where('farm_id').equals(farmId).toArray() as MediaRow[]).sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0));
  const todo: MediaRow[] = [];
  for (const m of all) if ((await db.settings.get(KEY(m.id)))?.value !== true) todo.push(m);
  let uploaded = 0; let next = 0;
  const worker = async (): Promise<void> => {
    for (;;) {
      const i = next; next += 1;
      if (i >= todo.length) return;
      const m = todo[i];
      await put({ id: m.id, sha256: m.sha256, mime: m.mime, bytes: m.data });
      await putLocal(db, KEY(m.id), true);
      uploaded += 1;
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, parallel) }, () => worker()));   // a failure rejects: what already went up is remembered
  return { uploaded, left: todo.length - uploaded };
}
