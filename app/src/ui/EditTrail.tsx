import { formatDate } from '../i18n';
import { t, type I18nKey } from '../i18n';
import { formatArea } from '../i18n/format';
import { editsOf, type Edit } from '../records/edits';
import type { Row } from '../db/schema';
import { STATUS_KEYS } from './PlantingForm';
import { TOPO_KEYS } from './ParcelForm';

const FIELD_KEYS: Record<string, I18nKey> = { name: 'edit.f.name', area_str: 'edit.f.area', topo_class: 'edit.f.topo', opekepe_code: 'edit.f.osde', boundary: 'edit.f.boundary', sown_on: 'edit.f.sown', status: 'edit.f.status', variety: 'edit.f.variety', lot_label: 'edit.f.lot' };
const text = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');

/** The previous value of one field, in the farmer's words (never a raw code). */
function shown(field: string, v: unknown): string {
  if (v === null || v === undefined || v === '') return t('value.unknown');
  if (field === 'area_str') return formatArea(text(v));
  if (field === 'status') { const k = (STATUS_KEYS as Record<string, I18nKey>)[text(v)]; return k ? t(k) : text(v); }
  if (field === 'topo_class') { const k = (TOPO_KEYS as Record<string, I18nKey>)[text(v)]; return k ? t(k) : text(v); }
  if (field === 'boundary') return t('map.has');
  if (field === 'sown_on') return formatDate(text(v));
  return text(v);
}

const lineOf = (e: Edit): string => t('edit.was', { when: formatDate(e.at.slice(0, 10)), reason: e.reason, values: Object.entries(e.before).map(([f, v]) => `${FIELD_KEYS[f] ? t(FIELD_KEYS[f]) : f}: ${shown(f, v)}`).join('; ') });

/** The earlier states of a parcel or planting, oldest first: the date, the reason and what the changed fields were before. Nothing when it was never edited. */
export function EditTrail({ row }: { row: Row }) {
  const edits = editsOf(row);
  if (edits.length === 0) return null;
  return (
    <details data-testid="edit-trail">
      <summary>{t('edit.trail', { n: edits.length })}</summary>
      {edits.map((e) => <small key={e.at} data-testid="edit-entry">{lineOf(e)}</small>)}
    </details>
  );
}
