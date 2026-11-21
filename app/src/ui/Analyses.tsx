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
import { AnalysisExplain, type Measurement } from './AnalysisExplain';
import { ListRow } from './ds';
import { BackBar } from './BackBar';

const text = (v: unknown): string => (typeof v === 'string' ? v : '');
const unitText = (u: unknown): string => { const k = EC_UNITS.find((x) => x === u); return k ? t(EC_UNIT_KEYS[k]) : t('value.unknown'); }; // a unit nobody can read is never guessed
const KIND_KEYS: Record<Kind, I18nKey> = { soil: 'analysis.kind.soil', water: 'analysis.kind.water' };

/** One parcel's soil and water analyses, newest first. Add (soil or water) and archive with undo; the report photo stays on the phone. */
export function Analyses({ parcel, onBack, readOnly = false }: { parcel: Row; onBack: () => void; readOnly?: boolean }) {
  const [reading, setReading] = useState<{ kind: Kind; row: Row; field: Measurement } | undefined>(undefined);
  const [adding, setAdding] = useState<Kind | undefined>(undefined);
  const soil = useRows('soil_tests');
  const water = useRows('water_tests');
  if (adding) return <AnalysisForm parcel={parcel} kind={adding} onDone={() => setAdding(undefined)} />;
  const rows = [
    ...(soil.rows ?? []).map((r) => ({ kind: 'soil' as const, r })),
    ...(water.rows ?? []).map((r) => ({ kind: 'water' as const, r })),
  ].filter((x) => x.r.parcel_id === parcel.id && !x.r.deleted_at).sort((a, b) => text(b.r.sampled_on).localeCompare(text(a.r.sampled_on)));
  if (reading) return <AnalysisExplain field={reading.field} row={reading.row}
    records={rows.filter((item) => item.kind === reading.kind).map((item) => item.r)} onBack={() => setReading(undefined)} />;
  const archive = async (kind: Kind, r: Row) => {
    await put(db, TABLES[kind], archived(r, new Date().toISOString()));
    dataVersion.value++;
    showUndo(t('analysis.archived'), async () => { await put(db, TABLES[kind], restored(r, new Date().toISOString())); dataVersion.value++; });
  };
  const cards = rows.map(({ kind, r }) => {
    const line = (name: I18nKey, value: string) => t('labeluse.line', { name: t(name), value });
    const lines = [
      ...(text(r.lab) ? [line('analysis.name.lab', text(r.lab))] : []),
      ...(text(r.notes) ? [text(r.notes)] : []),
    ];
    const date = isCalendarDate(text(r.sampled_on)) ? formatDateLong(text(r.sampled_on)) : t('value.unknown');
    return { kind, r, lines, title: t('labeluse.line', { name: t(KIND_KEYS[kind]), value: date }) };
  });
  return (
    <section>
      <BackBar onBack={onBack} />
      <h1 tabIndex={-1}>{String(parcel.name)}</h1>
      <h2>{t('analysis.title')}</h2>
      {!readOnly && <button class="btn" data-testid="analysis-add-soil" onClick={() => setAdding('soil')}>{t('analysis.add.soil')}</button>}
      {!readOnly && <button class="btn" data-testid="analysis-add-water" onClick={() => setAdding('water')}>{t('analysis.add.water')}</button>}
      {soil.rows && water.rows && cards.length === 0 && <p class="muted" data-testid="analysis-empty">{t('analysis.empty')}</p>}
      {cards.map((c) => (
        <div class="card" key={c.r.id} data-testid="analysis">{c.title}
          {text(c.r.ph) && <ListRow testid="analysis-ph-source" heading={t('analysis.name.ph')} meta={formatQty(text(c.r.ph))}
            onClick={() => setReading({ kind: c.kind, row: c.r, field: 'ph' })} />}
          {text(c.r.ec) && <ListRow testid="analysis-ec-source" heading={t('analysis.name.ec')}
            meta={t('labeluse.dosevalue', { v: formatQty(text(c.r.ec)), unit: unitText(c.r.ec_unit) })}
            onClick={() => setReading({ kind: c.kind, row: c.r, field: 'ec' })} />}
          {c.lines.map((l) => <small key={l}>{l}</small>)}
          {text(c.r.photo_id) && <div class="photos"><MediaThumb id={text(c.r.photo_id)} /></div>}
          <UnsyncedMark id={c.r.id} />
          {!readOnly && <button class="btn secondary" onClick={() => void archive(c.kind, c.r)}>{t('analysis.archive')}</button>}
        </div>
      ))}
    </section>
  );
}
