import { useState } from 'preact/hooks';
import { known, type Known } from '@aloni/rules-core';
import { t, tn, type I18nKey } from '../i18n';
import { formatDose, formatQty } from '../i18n/format';
import { readUse, statusOf, type Status } from '../labels/label-use';
import type { Row } from '../db/schema';
import { LabelUseForm, UNIT_KEYS } from './LabelUseForm';
import { nameOf } from './screens';
import { UnsyncedMark } from './states';
import { useRows } from './useRows';

const STATUS_KEYS: Record<Status, I18nKey> = {
  blocked: 'labeluse.status.blocked', unsigned: 'labeluse.status.unsigned', changed: 'labeluse.status.changed', signed: 'labeluse.status.unsigned', // «signed» is shown by the sign-off PR
};

/** A label value as the farmer sees it: the value, or why there is none («δεν αναγράφεται» / not filled in / unreadable). */
function show<T>(k: Known<T>, shown: (v: T) => string): string {
  if (k.known) return shown(k.value);
  if (k.reason === 'not_on_label') return t('labeluse.notOnLabel');
  return k.reason === 'missing' ? t('labeluse.notFilled') : t('value.unknown');
}

function Lines({ row }: { row: Row }) {
  const u = readUse(row);
  const dose = show(u.dose, (d) => t('labeluse.dosevalue', { v: d.kind === 'single' ? formatDose(known(d.min)) : t('labeluse.range', { min: formatDose(known(d.min)), max: formatDose(known(d.max)) }), unit: t(UNIT_KEYS[d.unit]) }));
  const line = (name: I18nKey, value: string) => <small>{t('labeluse.line', { name: t(name), value })}</small>;
  return (
    <>
      {line('labeluse.dose', dose)}
      {line('labeluse.phi', show(u.phiDays, (n) => tn('labeluse.days', n)))}
      {line('labeluse.rei', show(u.reiHours, (n) => tn('labeluse.hours', n)))}
      {line('labeluse.maxApps', show(u.maxApps, (n) => formatQty(n)))}
    </>
  );
}

/** One product's label uses, per crop: the values, and «Μη εγκεκριμένο» / blocked until an agronomist's approval is recorded. */
export function LabelUses({ product, onBack }: { product: Row; onBack: () => void }) {
  const [editing, setEditing] = useState<Row | 'new' | undefined>(undefined);
  const uses = useRows('label_uses');
  const crops = useRows('crops');
  const mine = uses.rows?.filter((u) => u.product_id === product.id && !u.deleted_at) ?? [];
  const cropOf = (id: unknown) => crops.rows?.find((c) => c.id === id);
  if (editing) {
    const taken = new Set(mine.map((u) => String(cropOf(u.crop_id)?.slug)));
    return <LabelUseForm productId={product.id} taken={taken} existing={editing === 'new' ? undefined : editing} onDone={() => setEditing(undefined)} />;
  }
  return (
    <section>
      <h1>{nameOf(product)}</h1>
      <button class="btn secondary" onClick={onBack}>{t('info.back')}</button>
      <h2>{t('labeluse.title')}</h2>
      <button class="btn" data-testid="labeluse-add" onClick={() => setEditing('new')}>{t('labeluse.add')}</button>
      {uses.rows && mine.length === 0 && <p class="muted" data-testid="labeluse-empty">{t('labeluse.empty')}</p>}
      {mine.map((r) => {
        const st = statusOf(r);
        const crop = cropOf(r.crop_id);
        return (
          <div class="card" key={r.id} data-testid="labeluse">{crop ? nameOf(crop) : t('value.unknown')}
            <span class={`badge ${st}`} data-testid="labeluse-status">{t(STATUS_KEYS[st])}</span>
            <Lines row={r} />
            <UnsyncedMark id={r.id} />
            <button class="btn secondary" onClick={() => setEditing(r)}>{t('labeluse.edit')}</button>
          </div>
        );
      })}
    </section>
  );
}
