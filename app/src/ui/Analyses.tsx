import { useState } from 'preact/hooks';
import { dataVersion, db } from '../db';
import { isCalendarDate } from '@aloni/rules-core';
import { EC_UNITS, TABLES, type Kind } from '../analyses/analysis';
import { formatDateLong, t, type I18nKey } from '../i18n';
import { formatQty } from '../i18n/format';
import { archived, restored } from '../parcels/parcel';
import { put } from '../repo';
import type { Row } from '../db/schema';
import { AnalysisForm, EC_UNIT_KEYS } from './AnalysisForm';
import { MediaThumb } from './Photos';
import { UnsyncedMark } from './states';
import { showUndo } from './Toast';
import { useRows } from './useRows';

const text = (v: unknown): string => (typeof v === 'string' ? v : '');
const unitText = (u: unknown): string => { const k = EC_UNITS.find((x) => x === u); return k ? t(EC_UNIT_KEYS[k]) : t('value.unknown'); }; // a unit nobody can read is never guessed
const KIND_KEYS: Record<Kind, I18nKey> = { soil: 'analysis.kind.soil', water: 'analysis.kind.water' };

/** One parcel's soil and water analyses, newest first. Add (soil or water) and archive with undo; the report photo stays on the phone. */
export function Analyses({ parcel, onBack }: { parcel: Row; onBack: () => void }) {
  const [adding, setAdding] = useState<Kind | undefined>(undefined);
  const soil = useRows('soil_tests');
  const water = useRows('water_tests');
  if (adding) return <AnalysisForm parcel={parcel} kind={adding} onDone={() => setAdding(undefined)} />;
  const rows = [
    ...(soil.rows ?? []).map((r) => ({ kind: 'soil' as const, r })),
    ...(water.rows ?? []).map((r) => ({ kind: 'water' as const, r })),
  ].filter((x) => x.r.parcel_id === parcel.id && !x.r.deleted_at).sort((a, b) => text(b.r.sampled_on).localeCompare(text(a.r.sampled_on)));
  const archive = async (kind: Kind, r: Row) => {
    await put(db, TABLES[kind], archived(r, new Date().toISOString()));
    dataVersion.value++;
    showUndo(t('analysis.archived'), async () => { await put(db, TABLES[kind], restored(r, new Date().toISOString())); dataVersion.value++; });
  };
  const cards = rows.map(({ kind, r }) => {
    const line = (name: I18nKey, value: string) => t('labeluse.line', { name: t(name), value });
    const lines = [
      ...(text(r.lab) ? [line('analysis.name.lab', text(r.lab))] : []),
      ...(text(r.ph) ? [line('analysis.name.ph', formatQty(text(r.ph)))] : []),
      ...(text(r.ec) ? [line('analysis.name.ec', t('labeluse.dosevalue', { v: formatQty(text(r.ec)), unit: unitText(r.ec_unit) }))] : []),
      ...(text(r.notes) ? [text(r.notes)] : []),
    ];
    const date = isCalendarDate(text(r.sampled_on)) ? formatDateLong(text(r.sampled_on)) : t('value.unknown');
    return { kind, r, lines, title: t('labeluse.line', { name: t(KIND_KEYS[kind]), value: date }) };
  });
  return (
    <section>
      <h1>{String(parcel.name)}</h1>
      <button class="btn secondary" onClick={onBack}>{t('info.back')}</button>
      <h2>{t('analysis.title')}</h2>
      <button class="btn" data-testid="analysis-add-soil" onClick={() => setAdding('soil')}>{t('analysis.add.soil')}</button>
      <button class="btn" data-testid="analysis-add-water" onClick={() => setAdding('water')}>{t('analysis.add.water')}</button>
      {soil.rows && water.rows && cards.length === 0 && <p class="muted" data-testid="analysis-empty">{t('analysis.empty')}</p>}
      {cards.map((c) => (
        <div class="card" key={c.r.id} data-testid="analysis">{c.title}
          {c.lines.map((l) => <small key={l}>{l}</small>)}
          {text(c.r.photo_id) && <div class="photos"><MediaThumb id={text(c.r.photo_id)} /></div>}
          <UnsyncedMark id={c.r.id} />
          <button class="btn secondary" onClick={() => void archive(c.kind, c.r)}>{t('analysis.archive')}</button>
        </div>
      ))}
    </section>
  );
}
