import { useState } from 'preact/hooks';
import { dataVersion, db } from '../db';
import { archived, restored } from '../parcels/parcel';
import { put } from '../repo';
import { showUndo } from './Toast';
import { SignOff } from './SignOff';
import { formatDate, t, tn, type I18nKey } from '../i18n';
import { formatDose, formatQty } from '../i18n/format';
import { isCalendarDate, known, type Known } from '@aloni/rules-core';
import { readNote, readUse, statusOf, type Status } from '../labels/label-use';
import { MediaThumb } from './Photos';
import type { Row } from '../db/schema';
import { LabelUseForm, UNIT_KEYS } from './LabelUseForm';
import { nameOf } from './screens';
import { UnsyncedMark } from './states';
import { useRows } from './useRows';
import { BackBar } from './BackBar';

const STATUS_KEYS: Record<Status, I18nKey> = {
  blocked: 'labeluse.status.blocked', unsigned: 'labeluse.status.unsigned', changed: 'labeluse.status.changed', signed: 'labeluse.status.signed',
};

/** A label value as the farmer sees it: the value, or why there is none («δεν αναγράφεται» / not filled in / unreadable). */
function show<T>(k: Known<T>, shown: (v: T) => string): string {
  if (k.known) return shown(k.value);
  if (k.reason === 'not_on_label') return t('labeluse.notOnLabel');
  return k.reason === 'missing' ? t('labeluse.notFilled') : t('value.unknown');
}

export function Lines({ row }: { row: Row }) {
  const u = readUse(row);
  const dose = show(u.dose, (d) => t('labeluse.dosevalue', { v: d.kind === 'single' ? formatDose(known(d.min)) : t('labeluse.range', { min: formatDose(known(d.min)), max: formatDose(known(d.max)) }), unit: t(UNIT_KEYS[d.unit]) }));
  const line = (name: I18nKey, value: string) => <small>{t('labeluse.line', { name: t(name), value })}</small>;
  return (
    <>
      {line('labeluse.dose', dose)}
      {line('labeluse.name.phi', show(u.phiDays, (n) => tn('labeluse.days', n)))}
      {line('labeluse.name.rei', show(u.reiHours, (n) => tn('labeluse.hours', n)))}
      {line('labeluse.name.maxApps', show(u.maxApps, (n) => formatQty(n)))}
    </>
  );
}

/** The badge text of a label use: who signed, no signature, changed after the signature, or blocked (missing values). */
export function badgeText(r: Row, st: Status): string {
  const so = r.sign_off as { by?: unknown; on?: unknown } | undefined;
  const on = typeof so?.on === 'string' && isCalendarDate(so.on) ? formatDate(so.on) : t('value.unknown');
  return st === 'signed' ? t('labeluse.status.signed', { by: String(so?.by), on }) : t(STATUS_KEYS[st]);
}

/** One product's label uses, per crop: the values, and «Μη εγκεκριμένο» / blocked until an agronomist's approval is recorded. */
export function LabelUses({ product, onBack, readOnly = false }: { product: Row; onBack: () => void; readOnly?: boolean }) {
  const [editing, setEditing] = useState<Row | 'new' | undefined>(undefined);
  const [signing, setSigning] = useState('');
  const uses = useRows('label_uses');
  const crops = useRows('crops');
  const mine = uses.rows?.filter((u) => u.product_id === product.id && !u.deleted_at) ?? [];
  const cropOf = (id: unknown) => crops.rows?.find((c) => c.id === id);
  if (editing) {
    const taken = new Set(mine.map((u) => String(cropOf(u.crop_id)?.slug)));
    return <LabelUseForm productId={product.id} taken={taken} existing={editing === 'new' ? undefined : editing} onDone={() => setEditing(undefined)} />;
  }
  const archive = async (r: Row) => {
    await put(db, 'label_uses', archived(r, new Date().toISOString()));
    dataVersion.value++;
    showUndo(t('labeluse.archived'), async () => { await put(db, 'label_uses', restored(r, new Date().toISOString())); dataVersion.value++; });
  };
  return (
    <section>
      <BackBar onBack={onBack} />
      <h1 tabIndex={-1}>{nameOf(product)}</h1>
      <h2>{t('labeluse.title')}</h2>
      {!readOnly && <button class="btn" data-testid="labeluse-add" onClick={() => setEditing('new')}>{t('labeluse.add')}</button>}
      {uses.rows && mine.length === 0 && <p class="muted" data-testid="labeluse-empty">{t('labeluse.empty')}</p>}
      {mine.map((r) => {
        const st = statusOf(r);
        const crop = cropOf(r.crop_id);
        return (
          <div class={st === 'blocked' ? 'card blocked' : 'card'} key={r.id} data-testid="labeluse">{crop ? nameOf(crop) : t('value.unknown')}
            <span class={`badge ${st}`} data-testid="labeluse-status">{badgeText(r, st)}</span>
            <Lines row={r} />
            {st === 'signed' && readNote(r).note && <small data-testid="signoff-shown-note">{readNote(r).note}</small>}
            {st === 'signed' && readNote(r).photoId && <div class="photos"><MediaThumb id={String(readNote(r).photoId)} /></div>}
            <UnsyncedMark id={r.id} />
            {!readOnly && (st === 'unsigned' || st === 'changed') && signing !== r.id && <button class="btn secondary" data-testid="signoff-open" onClick={() => setSigning(r.id)}>{t('signoff.record')}</button>}
            {!readOnly && signing === r.id && <SignOff row={r} onDone={() => setSigning('')} />}
            {!readOnly && <button class="btn secondary" onClick={() => setEditing(r)}>{t('labeluse.edit')}</button>}
            {!readOnly && <button class="btn secondary" onClick={() => void archive(r)}>{t('labeluse.archive')}</button>}
          </div>
        );
      })}
    </section>
  );
}
