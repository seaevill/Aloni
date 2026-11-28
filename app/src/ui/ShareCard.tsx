import { useEffect, useState } from 'preact/hooks';
import { DEMO_FARM_ID } from '../config';
import { activeFarm } from '../db';
import { formatDate, t } from '../i18n';
import { formatQty } from '../i18n/format';
import { APP_NAME_EL } from '../config';
import { athensToday } from '../plantings/planting';
import { HANDLE_MAX, readShareColors, shareCardSvg, topCropSlugs } from '../share/card';
import { sharePng, svgToPng } from '../share/render';
import { cratesLogged } from '../summary/today';
import { useRows } from './useRows';

// Owner only (Σήμερα → share icon): a preview of ONE picture, then the phone's share sheet or a download. Nothing is posted or sent by the app; the owner taps share himself. See share/card.ts for what the picture can hold.
const HANDLE_KEY = 'share_handle';
const readHandle = (): string => { try { return localStorage.getItem(HANDLE_KEY) ?? ''; } catch { return ''; } };
const saveHandle = (v: string): void => { try { if (v.trim() === '') localStorage.removeItem(HANDLE_KEY); else localStorage.setItem(HANDLE_KEY, v); } catch { /* ignore */ } };

export function ShareCard({ onClose }: { onClose: () => void }) {
  const harvests = useRows('job_harvest'); const plantings = useRows('plantings'); const crops = useRows('crops');
  const [handle, setHandle] = useState(readHandle());
  const [png, setPng] = useState<Blob | undefined>(undefined); const [preview, setPreview] = useState(''); const [failed, setFailed] = useState(false);
  const loaded = !!(harvests.rows && plantings.rows && crops.rows);
  const nowIso = new Date().toISOString();
  const demo = activeFarm.value === DEMO_FARM_ID;
  const crates = loaded ? cratesLogged(harvests.rows ?? [], nowIso, 7) : undefined;
  const slugs = loaded ? topCropSlugs(harvests.rows ?? [], plantings.rows ?? [], crops.rows ?? [], nowIso, 3) : [];
  const today = athensToday(new Date()) ?? '';
  const svg = shareCardSvg({ name: APP_NAME_EL, dateText: today ? formatDate(today) : '', cratesText: crates === undefined ? undefined : formatQty(crates), cropSlugs: slugs, handle, demo, captions: { crates: t('ui.share.crates'), demo: t('ui.share.demo') }, colors: readShareColors() });
  useEffect(() => {
    if (!loaded) return undefined;
    let url = ''; let alive = true;
    void svgToPng(svg).then((b) => { if (!alive) return; if (!b) { setFailed(true); return; } setFailed(false); setPng(b); url = URL.createObjectURL(b); setPreview(url); });
    return () => { alive = false; if (url !== '') URL.revokeObjectURL(url); };
  }, [loaded, svg]);
  const send = async () => { if (png) await sharePng(png, 'aloni.png', navigator as unknown as Parameters<typeof sharePng>[2]); };
  return (
    <section data-testid="share-card">
      <h1>{t('ui.share.title')}</h1>
      <p class="muted" data-testid="share-privacy">{t('ui.share.privacy')}</p>
      {preview !== '' && <img src={preview} class="share-preview" data-testid="share-preview" alt="" />}
      {failed && <p class="msg error" role="alert">{t('ui.share.failed')}</p>}
      <label class="field">{t('ui.share.handle')}<input class="input" value={handle} maxLength={HANDLE_MAX} autoComplete="off" data-testid="share-handle" onInput={(e) => { const v = (e.target as HTMLInputElement).value; setHandle(v); saveHandle(v); }} /></label>
      <button class="btn" data-testid="share-send" disabled={!png} onClick={() => void send()}>{t('ui.share.send')}</button>
      <button class="btn secondary" data-testid="share-close" onClick={onClose}>{t('ui.share.close')}</button>
    </section>
  );
}
