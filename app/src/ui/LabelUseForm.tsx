import { useState } from 'preact/hooks';
import { dataVersion, db, realFarmId } from '../db';
import { CATALOG, cropRow } from '../crops/catalog';
import { lang, t, type I18nKey } from '../i18n';
import { buildLabelUse, DOSE_UNITS, KINDS, toInput, type Field, type FieldName, type LabelUseInput } from '../labels/label-use';
import { archived } from '../parcels/parcel';
import { putMany, put } from '../repo';
import type { Row } from '../db/schema';
import type { DoseKind, DoseUnit } from '@aloni/rules-core';
import { showUndo } from './Toast';

export const UNIT_KEYS: Record<DoseUnit, I18nKey> = {
  'ml/str': 'labeluse.unit.ml_str', 'g/str': 'labeluse.unit.g_str', 'l/str': 'labeluse.unit.l_str', 'kg/str': 'labeluse.unit.kg_str', 'ml/100l': 'labeluse.unit.ml_100l', 'g/100l': 'labeluse.unit.g_100l',
};
const KIND_KEYS: Record<DoseKind, I18nKey> = { single: 'labeluse.kind.single', range: 'labeluse.kind.range' };
const BLANK: Field = { notOnLabel: false, text: '' };

/** One label value: a box to type in, or the «Δεν αναγράφεται» switch (the label does not say). Empty is allowed and means «not filled in» = blocked. */
function ValueField({ labelKey, f, set, error, whole }: { labelKey: I18nKey; f: Field; set: (f: Field) => void; error: boolean; whole: boolean }) {
  const errorKey: I18nKey = whole ? 'labeluse.error.whole' : 'labeluse.error.decimal';
  return (
    <>
      <label class="field">{t(labelKey)}
        <input class="input" value={f.text} disabled={f.notOnLabel} inputMode={whole ? 'numeric' : 'decimal'} autoComplete="off" onInput={(e) => set({ notOnLabel: false, text: (e.target as HTMLInputElement).value })} />
      </label>
      {error && <p class="msg error" role="alert">{t(errorKey)}</p>}
      <button class="btn secondary" aria-pressed={f.notOnLabel} onClick={() => set({ notOnLabel: !f.notOnLabel, text: '' })}>{t('labeluse.notOnLabel')}</button>
    </>
  );
}

/** Add (or edit) what the label says for one product on one crop. Nothing is preselected; saving an incomplete label is fine, it is just blocked. */
export function LabelUseForm({ productId, taken, existing, onDone }: { productId: string; taken: ReadonlySet<string>; existing?: Row; onDone: () => void }) {
  const [v, setV] = useState<LabelUseInput>(existing ? toInput(existing) : { productId, cropId: '', target: '', source: '', kind: undefined, unit: undefined, doseMin: BLANK, doseMax: BLANK, phi: BLANK, rei: BLANK, maxApps: BLANK });
  const [slug, setSlug] = useState('');
  const [bad, setBad] = useState<ReadonlySet<FieldName | 'range'>>(new Set());
  const [cropMissing, setCropMissing] = useState(false);
  const patch = (p: Partial<LabelUseInput>) => setV({ ...v, ...p });
  const crop = CATALOG.find((c) => c.slug === slug);

  const save = async () => {
    const now = new Date().toISOString();
    const cropRowValue = crop ? await cropRow(crop, realFarmId.value, now) : undefined;
    const r = buildLabelUse({ ...v, cropId: existing ? v.cropId : cropRowValue?.id ?? '' }, realFarmId.value, now, existing?.id ?? crypto.randomUUID(), existing ? String(existing.created_at) : now);
    if (!r.ok) { setBad(r.invalid); setCropMissing(r.crop); return; }
    const newCrop = cropRowValue && !(await db.crops.get(cropRowValue.id)) ? [{ table: 'crops', row: cropRowValue, op: 'insert' as const }] : [];
    await putMany(db, [...newCrop, { table: 'label_uses', row: r.row, op: existing ? 'update' : 'insert' }]); // the crop and its label details together
    dataVersion.value++;
    showUndo(t('labeluse.saved'), async () => { await put(db, 'label_uses', existing ?? archived(r.row, new Date().toISOString())); dataVersion.value++; });
    onDone();
  };

  const titleKey: I18nKey = existing ? 'labeluse.edit' : 'labeluse.add';
  return (
    <section>
      <h1>{t(titleKey)}</h1>
      {!existing && (
        <>
          <h2>{t('planting.crop')}</h2>
          <div class="seg two">
            {CATALOG.map((c) => <button key={c.slug} disabled={taken.has(c.slug)} aria-pressed={slug === c.slug} onClick={() => setSlug(c.slug)}>{c[lang.value]}</button>)}
          </div>
          {cropMissing && <p class="msg error" role="alert">{t('planting.error.crop')}</p>}
        </>
      )}

      <h2>{t('labeluse.kind.title')}</h2>
      <div class="seg two">
        {KINDS.map((k) => <button key={k} aria-pressed={v.kind === k} onClick={() => patch({ kind: k })}>{t(KIND_KEYS[k])}</button>)}
      </div>
      <h2>{t('labeluse.unit.title')}</h2>
      <div class="seg two">
        {DOSE_UNITS.map((u) => <button key={u} aria-pressed={v.unit === u} onClick={() => patch({ unit: u })}>{t(UNIT_KEYS[u])}</button>)}
      </div>

      <ValueField labelKey={v.kind === 'range' ? 'labeluse.dose.min' : 'labeluse.dose'} f={v.doseMin} set={(f) => patch({ doseMin: f })} error={bad.has('doseMin')} whole={false} />
      {v.kind === 'range' && <ValueField labelKey="labeluse.dose.max" f={v.doseMax} set={(f) => patch({ doseMax: f })} error={bad.has('doseMax')} whole={false} />}
      {bad.has('range') && <p class="msg error" role="alert">{t('labeluse.error.range')}</p>}
      <ValueField labelKey="labeluse.phi" f={v.phi} set={(f) => patch({ phi: f })} error={bad.has('phi')} whole />
      <ValueField labelKey="labeluse.rei" f={v.rei} set={(f) => patch({ rei: f })} error={bad.has('rei')} whole />
      <ValueField labelKey="labeluse.maxApps" f={v.maxApps} set={(f) => patch({ maxApps: f })} error={bad.has('maxApps')} whole />

      <label class="field">{t('labeluse.target')}
        <input class="input" value={v.target} autoComplete="off" onInput={(e) => patch({ target: (e.target as HTMLInputElement).value })} />
      </label>
      <label class="field">{t('labeluse.source')}
        <input class="input" value={v.source} autoComplete="off" onInput={(e) => patch({ source: (e.target as HTMLInputElement).value })} />
      </label>

      <button class="btn" data-testid="labeluse-save" onClick={() => void save()}>{t('product.save')}</button>
      <button class="btn secondary" onClick={onDone}>{t('product.cancel')}</button>
    </section>
  );
}
