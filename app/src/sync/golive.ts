import { signal } from '@preact/signals';
import { DEMO_FARM_ID } from '../config';
import type { AppDB } from '../db/schema';
import { putLocal } from '../repo';
import type { ReadinessItem } from '../settings/readiness';
import { push, pull, type Transport } from './engine';
import { uploadMedia, type MediaPut } from './media';

// «Go live» (the first full upload). Everything here is dormant unless the owner presses the button in the wizard (Άλλα → Σύνδεση λογαριασμού), which only exists when config.LIVE is on.
// The switch is a DEVICE setting (`sync_enabled`): until it is on, no round runs, even when signed in. A worker's phone (an invitation was claimed) is switched on by the sign-in itself.
export const SYNC_FLAG = 'sync_enabled';
export const syncEnabled = signal(false);

export async function loadSyncFlag(db: AppDB): Promise<void> { syncEnabled.value = (await db.settings.get(SYNC_FLAG))?.value === true; }
export async function setSyncFlag(db: AppDB, on: boolean): Promise<void> { await putLocal(db, SYNC_FLAG, on); syncEnabled.value = on; }

export type GoLiveKey = ReadinessItem['key'] | 'signed_in' | 'backup';
export interface GoLiveItem { key: GoLiveKey; ok: boolean }

/** The wizard's checklist: the readiness items plus «signed in» and «a fresh backup» (RUNBOOK: back up first). The button is active only when EVERY item is ok. */
export function goLiveItems(base: readonly ReadinessItem[], extra: { signedIn: boolean; backupFresh: boolean }): GoLiveItem[] {
  return [...base, { key: 'signed_in', ok: extra.signedIn }, { key: 'backup', ok: extra.backupFresh }];
}
export const canGoLive = (items: readonly GoLiveItem[]): boolean => items.length > 0 && items.every((i) => i.ok);

export type GoLiveResult =
  | { ok: true; sent: number; written: number; photos: number }
  | { ok: false; step: 'demo_rows' | 'ping' | 'push' | 'pull' | 'photos'; message: string };
export interface Progress { step: 'ping' | 'push' | 'photos' | 'pull'; left?: number }

/**
 * The FIRST full upload, in a safe order: (1) the Demo farm's rows must never be in the queue (nothing is sent if one is), (2) the server answers an empty call (signed in, right farm, the
 * function exists), (3) the queued records go up in the order they were written (parents before children), a refusal stops everything and is reported, (4) photos one after another with
 * limited parallelism, not shrunk, (5) then a pull. A stop in the middle is safe to repeat: accepted records have left the queue, the rest wait and go on next time. On ANY failure the
 * caller leaves the switch OFF (that is the rollback: nothing local is changed or deleted).
 */
export async function goLive(db: AppDB, tr: Transport, farmId: string, media: MediaPut | undefined, onProgress: (p: Progress) => void = () => undefined): Promise<GoLiveResult> {
  if (farmId === DEMO_FARM_ID || (await db.outbox.where('farm_id').equals(DEMO_FARM_ID).count()) > 0) return { ok: false, step: 'demo_rows', message: 'demo rows are in the queue; nothing was sent' };
  onProgress({ step: 'ping' });
  try { const answer = await tr.applyOps([]); if (!Array.isArray(answer) || answer.length > 0) return { ok: false, step: 'ping', message: 'the server did not answer the empty call as expected' }; }
  catch (e) { return { ok: false, step: 'ping', message: e instanceof Error ? e.message : 'no answer' }; }
  let sent = 0;
  try {
    for (let round = 0; round < 1000; round += 1) {
      const left = await db.outbox.where('farm_id').equals(farmId).and((o) => o.status === 'pending').count();
      onProgress({ step: 'push', left });
      if (left === 0) break;
      const p = await push(db, tr, farmId);
      sent += p.sent;
      if (p.rejected > 0) return { ok: false, step: 'push', message: `${p.rejected} record(s) were refused by the server (they stay on this phone, listed under «not accepted»)` };
      if (p.sent === 0) break;   // nothing moved: do not spin
    }
  } catch (e) { return { ok: false, step: 'push', message: e instanceof Error ? e.message : 'upload stopped' }; }
  let photos = 0;
  if (media) {
    try { onProgress({ step: 'photos' }); photos = (await uploadMedia(db, media, farmId, 2)).uploaded; }
    catch (e) { return { ok: false, step: 'photos', message: e instanceof Error ? e.message : 'photo upload stopped' }; }
  }
  try { onProgress({ step: 'pull' }); const q = await pull(db, tr, farmId); return { ok: true, sent, written: q.written, photos }; }
  catch (e) { return { ok: false, step: 'pull', message: e instanceof Error ? e.message : 'download stopped' }; }
}
