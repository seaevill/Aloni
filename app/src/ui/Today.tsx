import { useState } from 'preact/hooks';
import { activeFarm, loadDemo, realFarmId, farmLabel } from '../db';
import { tab } from './nav';
import { formatDate, formatDateTime, t } from '../i18n';
import { formatArea, formatQty } from '../i18n/format';
import { athensToday } from '../plantings/planting';
import { cutFromParcel } from '../spray/harvest';
import { instantOf } from '../spray/time';
import { HarvestForm } from './HarvestForm';
import { History } from './History';
import { JobForm } from './JobForm';
import { SprayForm } from './SprayForm';
import { EmptyState, ErrorState } from './states';
import { Title, nameOf, retry } from './screens';
import { useRows, type Rows } from './useRows';
import type { Row } from '../db/schema';

// Σήμερα (Design 2): the date and the farm, ONE big card for the most urgent thing, the weather strip (empty until the data exists), a card per field with its cut counter,
// today's jobs and «+ Ανάθεση εργασίας». The records of the past live on their own screen («Ιστορικό»). Nothing here decides anything: the numbers come from the same functions as before.

/** Symbols that mean the same in every language (a word always sits next to them: colour is never the only signal). */
const MARK = { blocked: '✕', wait: '◷', info: 'ⓘ' } as const;
const text = (v: unknown): string => (typeof v === 'string' ? v : '');
const SP = ' ';
const BADGE = { unknown: { cls: 'badge blocked', mark: MARK.blocked }, from: { cls: 'badge unsigned', mark: MARK.wait }, free: { cls: 'badge neutral', mark: MARK.info } } as const;
const DASH = '\u2014';
const DAY_MS = 86_400_000;

interface FieldCard { p: Row; state: 'free' | 'from' | 'unknown'; at: string; late: boolean; source: string; crops: string }

/** The five days of the weather strip: every value is «—» until a forecast exists (the Open-Meteo function is not switched on). */
function WeatherStrip() {
  const base = Date.parse(`${athensToday(new Date()) ?? '1970-01-01'}T12:00:00Z`);
  return (
    <section class="wx card" data-testid="weather-strip" aria-label={t('today.weather')}>
      <div class="wx-row">
        {[0, 1, 2, 3, 4].map((i) => <div class={i === 0 ? 'd today' : 'd'} key={i}><span class="dn">{formatDate(new Date(base + i * DAY_MS).toISOString().slice(0, 10))}</span><span class="t">{DASH}</span></div>)}
      </div>
      <p class="muted wx-none">{t('today.weather.none')}</p>
    </section>
  );
}

function Fields({ cards, onUrgent }: { cards: FieldCard[]; onUrgent: () => void }) {
  void onUrgent;
  return (
    <>
      <h2>{t('today.fields')}</h2>
      {cards.map((c) => {
        const look = BADGE[c.state];
        const line = c.state === 'free' ? t('cut.free') : c.state === 'unknown' ? t('cut.unknown') : t('cut.from', { d: formatDateTime(c.at) });
        return (
          <div class={c.state === 'unknown' ? 'card field blocked' : 'card field'} key={c.p.id} data-testid="cut" data-state={c.state}>
            <div class="field-head"><strong>{text(c.p.name)}</strong>{typeof c.p.area_str !== 'undefined' && <span class="muted">{formatArea(c.p.area_str as number | string)}</span>}</div>
            {c.crops && <small>{c.crops}</small>}
            <span class={look.cls} data-testid="cut-line"><span aria-hidden="true">{look.mark}</span>{SP}{line}</span>
            {c.source && <small data-testid="cut-source">{c.source}</small>}
            {c.late && <span class="badge warn" data-testid="cut-late"><span aria-hidden="true">{MARK.wait}</span>{SP}{t('cut.late')}</span>}
          </div>
        );
      })}
    </>
  );
}

export function Today() {
  const [spraying, setSpraying] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [harvesting, setHarvesting] = useState(false);
  const [harvested, setHarvested] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [planned, setPlanned] = useState(false);
  const [history, setHistory] = useState(false);
  const rows = [useRows('parcels'), useRows('plantings'), useRows('products'), useRows('stock_lots'), useRows('crops')];
  const [parcels, plantings, products, lots, crops] = rows;
  const jobs = useRows('jobs'); const workers = useRows('workers'); const links = useRows('job_plantings'); const sprays = useRows('job_spray');
  const openJobs = (jobs.rows ?? []).filter((j) => !j.deleted_at && j.kind === 'spray' && j.status === 'planned');
  const live = (q: Rows) => q.rows?.filter((r) => !r.deleted_at) ?? [];
  const demo = activeFarm.value !== realFarmId.value;
  const cropsInUse = demo ? live(crops).length : new Set(live(plantings).map((p) => p.crop_id)).size;
  const loaded = rows.every((q) => q.rows);
  const has = live(parcels).length + live(plantings).length + live(products).length + live(lots).length + (demo ? live(crops).length : 0) > 0;
  if (planning) return <JobForm onDone={(saved) => { setPlanning(false); setPlanned(saved); }} />;
  if (harvesting) return <HarvestForm onDone={(saved) => { setHarvesting(false); setHarvested(saved); }} />;
  if (spraying) return <SprayForm onDone={(saved) => { setSpraying(false); setRecorded(saved); }} />;
  if (history) return <History readOnly={demo} onBack={() => setHistory(false)} />;

  const now = instantOf(new Date()) ?? '';
  const cards: FieldCard[] = live(parcels).map((p) => {
    const c = cutFromParcel(p.id, now, plantings.rows ?? [], links.rows ?? [], sprays.rows ?? []);
    const crops_ = [...new Set(live(plantings).filter((x) => x.parcel_id === p.id).map((x) => nameOf(crops.rows?.find((c2) => c2.id === x.crop_id) ?? {})))].join(', ');
    return { p, state: c.state, at: c.state === 'from' ? c.at : '', late: c.state === 'from' && c.late === true, source: c.state === 'from' ? t(c.source === 'manual' ? 'cut.source.manual' : 'cut.source.label') : '', crops: crops_ };
  });
  const urgent = cards.find((c) => c.state === 'unknown') ?? cards.filter((c) => c.state === 'from').sort((a, b) => a.at.localeCompare(b.at))[0];
  const today = athensToday(new Date()) ?? '';
  return (
    <section class="today">
      <header class="today-head">
        <p class="date" data-testid="today-date">{today ? formatDate(today) : ''}</p>
        <Title k="today.title" />
        <p class="farm muted" data-testid="today-farm">{farmLabel(activeFarm.value)}</p>
      </header>
      {rows.some((q) => q.failed) && <ErrorState onRetry={retry} />}
      {loaded && !has && (
        <EmptyState message={t('today.empty')} actionLabel={t('parcel.add')} onAction={() => { tab.value = 'parcels'; }} secondLabel={t('more.loadDemo')} onSecond={() => void loadDemo()} />
      )}
      {loaded && has && urgent && (
        <section class="hero" data-testid="urgent" aria-label={t('today.urgent')}>
          <span class="kicker"><span aria-hidden="true">{BADGE[urgent.state].mark}</span>{SP}{t('today.urgent')}</span>
          <h2>{urgent.state === 'unknown' ? t('today.urgent.unknown', { parcel: text(urgent.p.name) }) : t('today.urgent.wait', { d: formatDate(urgent.at.slice(0, 10)), crop: urgent.crops.split(', ')[0] ?? '', parcel: text(urgent.p.name) })}</h2>
          <button class="btn lime" data-testid="urgent-action" onClick={() => setHistory(true)}>{t('today.urgent.action')}</button>
        </section>
      )}
      {loaded && has && <WeatherStrip />}
      {loaded && has && <Fields cards={cards} onUrgent={() => setHistory(true)} />}
      {planned && <p class="msg" role="status" data-testid="job-saved">{t('job.saved')}</p>}
      {harvested && <p class="msg" role="status" data-testid="harvest-saved">{t('harvest.saved')}</p>}
      {recorded && <p class="msg" role="status" data-testid="spray-saved">{t('spray.saved')}</p>}
      {loaded && has && <h2>{t('worker.jobs')}</h2>}
      {loaded && has && openJobs.length === 0 && <p class="muted" data-testid="jobs-none">{t('today.jobs.none')}</p>}
      {openJobs.map((j) => <div class="card" key={j.id} data-testid="job-planned">{t('job.planned.line', { product: nameOf(products.rows?.find((p) => p.id === j.product_id) ?? {}), worker: text(workers.rows?.find((w) => w.id === j.worker_id)?.name), date: text(j.planned_for) })}</div>)}
      {loaded && has && <button class="btn" data-testid="job-open" disabled={demo} onClick={() => setPlanning(true)}>{t('job.add.plus')}</button>}
      {loaded && has && !demo && <button class="btn secondary" data-testid="spray-open" onClick={() => setSpraying(true)}>{t('spray.add')}</button>}
      {loaded && has && !demo && <button class="btn secondary" data-testid="harvest-open" onClick={() => setHarvesting(true)}>{t('harvest.add')}</button>}
      {loaded && has && <button class="row" data-testid="history-open" onClick={() => setHistory(true)}><span>{t('history.title')}</span><span aria-hidden="true" class="chev" /></button>}
      {loaded && has && <p class="card" data-testid="today-counts">{t('today.counts', { parcels: live(parcels).length, crops: formatQty(cropsInUse), plantings: formatQty(live(plantings).length) })}</p>}
    </section>
  );
}
