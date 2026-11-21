import { formatDate, t } from '../i18n';
import { formatArea, formatQty } from '../i18n/format';
import { cropSummary, harvestTable, type HarvestLine } from '../summary/drill';
import { cutToday } from '../summary/cutlist';
import { dayOf } from '../summary/today';
import { instantOf } from '../spray/time';
import { BigNum } from './ds/DataViz';
import { CropIcon } from './illustrations/crops/CropIcon';
import { Icon } from './icons/Icon';
import { DetailSheet, SheetFact } from './ds/DetailSheet';
import { ListRow } from './ds/Surfaces';
import { nameOf } from './screens';
import { openSheet, type Tab } from './nav';
import { registerSheet, type SheetProps } from './sheets';
import { useRows } from './useRows';
import type { Row } from '../db/schema';

// Σήμερα drill-downs (docs/plan/bora-feedback-2026-11-21.md §1): every number or card opens a sheet that says where it comes from. Unknown is written WITH its reason, never blank and never 0.
const live = (r: Row[] | null): Row[] => (r ?? []).filter((x) => !x.deleted_at);
const cropRowOf = (crops: Row[] | null, slug: string | undefined): Row | undefined => (slug === undefined ? undefined : (crops ?? []).find((c) => c.slug === slug));
export const openCropSheet = (cropId: unknown): void => { if (typeof cropId === 'string') openSheet('crop', cropId); };
export const SHEET_TAB: Tab = 'today';

/** «Κλούβες 7 / 28 ημ.»: the logged harvests that add up to the number, newest first; counts nobody can read are listed apart. */
function CratesSheet({ id, close }: SheetProps) {
  const harvests = useRows('job_harvest'); const plantings = useRows('plantings'); const parcels = useRows('parcels'); const crops = useRows('crops');
  const days = id === '28' ? 28 : 7;
  const tbl = harvestTable(harvests.rows ?? [], plantings.rows ?? [], parcels.rows ?? [], crops.rows ?? [], new Date().toISOString(), days);
  const line = (l: HarvestLine) => {
    const crop = cropRowOf(crops.rows, l.crop);
    return <ListRow key={l.id} heading={crop ? nameOf(crop) : t('ui.unknown')} meta={`${formatDate(dayOf(l.at))} · ${l.parcel ?? t('ui.unknown')}`} trailing={<strong>{l.crates === undefined ? t('ui.unknown') : formatQty(l.crates)}</strong>} onClick={crop ? () => openCropSheet(crop.id) : undefined} />;
  };
  return (
    <DetailSheet heading={t(days === 28 ? 'ui.sheet.crates28' : 'ui.sheet.crates7')} icon={<Icon name="crate" />} onClose={close} testid="sheet-crates">
      <BigNum caption={t('ui.sheet.crates.total')} value={tbl.total === undefined ? undefined : formatQty(tbl.total)} />
      {tbl.total === undefined && <p class="ds-muted" data-testid="sheet-why">{t('ui.sheet.crates.none')}</p>}
      {tbl.rows.map(line)}
      {tbl.unreadable.length > 0 && <p class="ds-muted" data-testid="sheet-unreadable">{t('ui.sheet.crates.unreadable', { n: formatQty(tbl.unreadable.length) })}</p>}
      {tbl.unreadable.map(line)}
    </DetailSheet>
  );
}

/** «Χωράφια N»: the parcels, with the area exactly as typed. */
function ParcelsSheet({ close }: SheetProps) {
  const parcels = useRows('parcels');
  const list = live(parcels.rows);
  return (
    <DetailSheet heading={t('ui.sheet.parcels')} icon={<Icon name="parcels" />} onClose={close} testid="sheet-parcels">
      {list.length === 0 && <p class="ds-muted" data-testid="sheet-why">{t('ui.sheet.parcels.none')}</p>}
      {list.map((p) => <ListRow key={String(p.id)} heading={nameOf(p)} meta={typeof p.area_str === 'string' && p.area_str !== '' ? formatArea(p.area_str) : t('ui.sheet.area.unknown')} />)}
    </DetailSheet>
  );
}

/** «Καλλιέργειες N»: the crops with plantings (or, in the Demo, the crops of the farm), with how many plantings each has. */
function CropsSheet({ close }: SheetProps) {
  const crops = useRows('crops'); const plantings = useRows('plantings');
  const list = live(crops.rows).filter((c) => live(plantings.rows).some((p) => p.crop_id === c.id) || live(plantings.rows).length === 0);
  return (
    <DetailSheet heading={t('ui.sheet.crops')} icon={<Icon name="crops" />} onClose={close} testid="sheet-crops">
      {list.length === 0 && <p class="ds-muted" data-testid="sheet-why">{t('ui.sheet.crops.none')}</p>}
      {list.map((c) => <ListRow key={String(c.id)} heading={nameOf(c)} meta={t('ui.sheet.crops.plantings', { n: formatQty(live(plantings.rows).filter((p) => p.crop_id === c.id).length) })} icon={<CropIcon slug={String(c.slug)} size="calc(var(--tile) - var(--sp-16))" />} onClick={() => openCropSheet(c.id)} />)}
    </DetailSheet>
  );
}

/** «Κοπή σήμερα» / «Χωράφια χωρίς αναμονή»: which plantings are free, which wait (until when) and which are unknown (why). Same rule as the harvest gate. */
function CutSheet({ close }: SheetProps) {
  const parcels = useRows('parcels'); const plantings = useRows('plantings'); const crops = useRows('crops'); const links = useRows('job_plantings'); const sprays = useRows('job_spray'); const labels = useRows('label_uses');
  const ct = cutToday(live(parcels.rows), live(plantings.rows), links.rows ?? [], sprays.rows ?? [], (id) => nameOf((crops.rows ?? []).find((c) => c.id === id) ?? {}), instantOf(new Date()) ?? '', labels.rows ?? []);
  const free = ct.lines.filter((l) => l.state === 'free'); const wait = ct.lines.filter((l) => l.state === 'from'); const unknown = ct.lines.filter((l) => l.state === 'unknown');
  const group = (head: string, why: string, rows: typeof ct.lines, trailing: (l: (typeof ct.lines)[number]) => string) => rows.length > 0 && (
    <section data-testid="sheet-group">
      <h3>{head}</h3><p class="ds-muted">{why}</p>
      {rows.map((l) => <ListRow key={l.id} heading={l.crop} meta={l.parcel} trailing={<strong>{trailing(l)}</strong>} onClick={() => openCropSheet(plantings.rows?.find((p) => p.id === l.id)?.crop_id)} />)}
    </section>
  );
  return (
    <DetailSheet heading={t('ui.sheet.cut')} icon={<Icon name="sickle" />} onClose={close} testid="sheet-cut">
      {ct.lines.length === 0 && <p class="ds-muted" data-testid="sheet-why">{t('ui.sheet.cut.none')}</p>}
      {group(t('ui.sheet.cut.free'), t('ui.sheet.cut.free.why'), free, () => '')}
      {group(t('ui.sheet.cut.wait'), t('ui.sheet.cut.wait.why'), wait, (l) => formatDate(l.at.slice(0, 10)))}
      {group(t('ui.sheet.cut.unknown'), t('ui.sheet.cut.unknown.why'), unknown, () => t('ui.unknown'))}
    </DetailSheet>
  );
}

/** One crop: its plantings with their parcels and typed areas, the crates logged today and in all, and the season target (only if the owner entered one; else the reason). */
function CropSheet({ id, close }: SheetProps) {
  const crops = useRows('crops'); const plantings = useRows('plantings'); const parcels = useRows('parcels'); const harvests = useRows('job_harvest');
  const crop = (crops.rows ?? []).find((c) => c.id === id);
  if (!crops.rows) return null;
  if (!crop) return <DetailSheet heading={t('ui.sheet.notfound.head')} onClose={close} testid="sheet-notfound"><p class="ds-muted">{t('ui.sheet.notfound.body')}</p></DetailSheet>;
  const s = cropSummary(id, plantings.rows ?? [], parcels.rows ?? [], harvests.rows ?? [], new Date().toISOString());
  return (
    <DetailSheet heading={nameOf(crop)} icon={<CropIcon slug={String(crop.slug)} size="calc(var(--tile) - var(--sp-16))" />} onClose={close} testid="sheet-crop">
      <SheetFact name={t('ui.sheet.crop.today')} value={s.today === undefined ? undefined : formatQty(s.today)} unknown={t('ui.sheet.crop.today.none')} />
      <SheetFact name={t('ui.sheet.crop.logged')} value={s.logged === undefined ? undefined : formatQty(s.logged)} unknown={t('ui.sheet.crop.logged.none')} />
      <SheetFact name={t('ui.sheet.crop.target')} unknown={t('ui.sheet.crop.target.none')} />
      <h3>{t('ui.sheet.crop.plantings')}</h3>
      {s.plantings.length === 0 && <p class="ds-muted" data-testid="sheet-why">{t('ui.sheet.crop.plantings.none')}</p>}
      {s.plantings.map((p) => <ListRow key={p.id} heading={p.parcel === '' ? t('ui.unknown') : p.parcel} meta={p.area === '' ? t('ui.sheet.area.unknown') : formatArea(p.area)} />)}
    </DetailSheet>
  );
}

registerSheet('crates', CratesSheet);
registerSheet('parcels', ParcelsSheet);
registerSheet('crops', CropsSheet);
registerSheet('cut', CutSheet);
registerSheet('crop', CropSheet);
