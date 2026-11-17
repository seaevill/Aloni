import type { AppDB, MediaRow } from '../db/schema';
import { sha256Hex } from '../db/sha256';
import { put } from '../repo';

export const MAX_SIDE = 2000;
export interface Encoded { blob: Blob; width: number; height: number }
export type Photo = { ok: true; id: string; duplicate: boolean } | { ok: false };

/**
 * Size after shrinking so that the longer side is at most `max` (never enlarged, proportions kept). The shorter side may come out
 * fractional: the canvas drops the fraction when it is sized, and the stored width/height are read back from the canvas. Unusable sizes give undefined.
 */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } | undefined {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) return undefined;
  const long = Math.max(width, height);
  if (long <= max) return { width, height };
  return { width: Math.max(1, (width * max) / long), height: Math.max(1, (height * max) / long) };
}

/**
 * Decodes a picked photo through an <img> (every browser applies the phone's rotation to it; createImageBitmap options differ between
 * Safari versions), shrinks it to ≤2000 px and re-encodes it as JPEG. undefined = could not be read: nothing is stored.
 */
export async function encodePhoto(file: Blob): Promise<Encoded | undefined> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const size = fitWithin(img.naturalWidth, img.naturalHeight, MAX_SIDE);
    if (!size) return undefined;
    const canvas = document.createElement('canvas');
    canvas.width = size.width; canvas.height = size.height; // fractions are dropped here
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, 'image/jpeg', 0.85));
    return blob ? { blob, width: canvas.width, height: canvas.height } : undefined;
  } catch {
    return undefined;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Stores an encoded photo: row + outbox entry in one transaction (through repo.put), id = client UUID, sha256 of the stored bytes.
 * The same bytes on the same farm are stored once: the existing id comes back with `duplicate: true`.
 */
export async function addPhoto(db: AppDB, farmId: string, enc: Encoded, nowIso: string, id: string = crypto.randomUUID()): Promise<Photo> {
  try {
    const sha256 = await sha256Hex(enc.blob);
    const same = await db.media.where('sha256').equals(sha256).filter((m) => m.farm_id === farmId).first();
    if (same) return { ok: true, id: same.id, duplicate: true };
    const row: MediaRow = { id, farm_id: farmId, sha256, mime: 'image/jpeg', data: await enc.blob.arrayBuffer(), width: enc.width, height: enc.height, bytes: enc.blob.size, created_at: nowIso };
    await put(db, 'media', row, 'insert');
    return { ok: true, id, duplicate: false };
  } catch {
    return { ok: false }; // e.g. storage full: the caller says so, nothing half-written (one transaction)
  }
}
