import { useState } from 'preact/hooks';
import { activeFarm } from '../db';
import { t } from '../i18n';
import { formatQty } from '../i18n/format';
import { seasonMonths } from '../summary/season-calendar';
import { PageHead } from './ds';
import { nameOf } from './screens';
import { useRows } from './useRows';
import './season-calendar.css';

export function SeasonCalendar({ onBack }: { onBack: () => void }) {
  const crops = useRows('crops');
  const plantings = useRows('plantings');
  const harvests = useRows('job_harvest');
  const [selection, setSelection] = useState('');
  const farm = activeFarm.value;
  const available = (crops.rows ?? []).filter((crop) => crop.farm_id === farm && !crop.deleted_at);
  const idsWithRecords = new Set((plantings.rows ?? []).filter((row) => row.farm_id === farm).map((row) => row.crop_id));
  const crop = available.find((row) => row.id === selection) ?? available.find((row) => idsWithRecords.has(row.id));
  const failed = crops.failed || plantings.failed || harvests.failed;
  const loaded = crops.rows && plantings.rows && harvests.rows;
  const model = loaded ? seasonMonths(farm, crop?.id ?? '', plantings.rows ?? [], harvests.rows ?? []) : undefined;
  const monthNames = t('ui.seasonCalendar.months').split('|');
  return <section data-testid="season-calendar">
    <PageHead heading={t('ui.seasonCalendar.title')} back={onBack} backText={t('info.back')} />
    <p>{t('ui.seasonCalendar.scope')}</p>
    {available.length > 0 && <label class="field">{t('register.col.crop')}
      <select class="input" value={crop?.id ?? ''} onChange={(event) => setSelection(event.currentTarget.value)}>
        {!crop && <option value="" disabled>{t('ui.seasonCalendar.select')}</option>}
        {available.map((row) => <option key={row.id} value={row.id}>{nameOf(row)}</option>)}
      </select>
    </label>}
    {failed ? <p role="alert">{t('state.error')}</p> : !loaded ? <p role="status">{t('ui.seasonCalendar.loading')}</p> : <>
      {model && <div class="season-calendar-grid">
        {model.months.map((month, index) => <section class="card season-calendar-month" key={index} data-testid="season-month">
          <h2>{monthNames[index]}</h2>
          <p>{t('ui.seasonCalendar.sown', { n: month.sown ? formatQty(month.sown) : t('ui.seasonCalendar.none') })}</p>
          <p>{t('ui.seasonCalendar.cut', { n: month.harvested ? formatQty(month.harvested) : t('ui.seasonCalendar.none') })}</p>
        </section>)}
      </div>}
      {!!model?.undated && <p>{t('ui.seasonCalendar.undated', { n: formatQty(model.undated) })}</p>}
    </>}
    <p class="muted">{t('ui.seasonCalendar.source')}</p>
  </section>;
}
