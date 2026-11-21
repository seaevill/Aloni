import { useEffect, useState } from 'preact/hooks';
import { useBack } from './backstack';
import { APP_NAME_EL } from '../config';
import { activeFarm, dataVersion, db, loadDemo, realFarmId, farmLabel } from '../db';
import { groupJobs } from '../summary/jobs';
import { openParcelForm, tab } from './nav';
import { formatDate, formatDateTime, lang, t, tn } from '../i18n';
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
import { dayOf, farmDay, parseDays, provenance, type Day } from '../weather/strip';
import { todaySummary, cutCrates, cratesLogged, cratesPerDay } from '../summary/today';
import { BigNum, Sparkline } from './ds';
import { Icon } from './icons/Icon';
import { ShareCard } from './ShareCard';
import { cutToday, type CutLine, type CutToday } from '../summary/cutlist';
import { loadOrders } from '../orders/store';
import { supplyByCrop } from '../orders/available';
import { fractionText } from '../orders/dispatch';
import { cutTodayBySlug, nextDay, tomorrowBoard, type BoardRow } from '../orders/tomorrow';
import { CATALOG, cropName } from '../crops/catalog';
import type { KlouvesOrders } from '../orders/klouves';
import { useWeather } from './useWeather';
import type { Row } from '../db/schema';

// Σήμερα (Design 2): the date and the farm, ONE big card for the most urgent thing, the weather strip (empty until the data exists), a card per field with its cut counter,
// today's jobs and «+ Ανάθεση εργασίας». The records of the past live on their own screen («Ιστορικό»). Nothing here decides anything: the numbers come from the same functions as before.

/** Symbols that mean the same in every language (a word always sits next to them: colour is never the only signal). */
const MARK = { blocked: '✕', wait: '◷', info: 'ⓘ' } as const;
const JOB_GROUPS = [['overdue', 'jobs.group.overdue'], ['today', 'jobs.group.today'], ['tomorrow', 'jobs.group.tomorrow'], ['later', 'jobs.group.later']] as const;
const text = (v: unknown): string => (typeof v === 'string' ? v : '');
const SP = ' ';
const BADGE = { unknown: { cls: 'badge blocked', mark: MARK.blocked }, from: { cls: 'badge unsigned', mark: MARK.wait }, free: { cls: 'badge neutral', mark: MARK.info } } as const;
const DASH = '\u2014';
const DAY_MS = 86_400_000;
/** «Πέμ 19»: weekday and day number only (the five days sit side by side on a phone). */
const dayLabel = (iso: string): string => formatDate(iso).split(' ').slice(0, 2).join(' ');

interface FieldCard { weather: string; p: Row; state: 'free' | 'from' | 'unknown'; at: string; late: boolean; source: string; crops: string }

/** «Weather now» (prototype layout): four tiles for today from the stored weather of every parcel, then the five-day strip. A tile without data shows «—»; nothing is invented. */
const issuedText = (iso: string | undefined): string => (iso === undefined ? t('value.unknown') : formatDateTime(iso));
const sourceLine = (p: { names: string[]; issued: string | undefined }): string => t('wx.source', { name: p.names.join(', '), when: issuedText(p.issued) });

function WeatherStrip({ perParcel }: { perParcel: ReadonlyArray<readonly Day[]> }) {
  const today = athensToday(new Date()) ?? '1970-01-01';
  const base = Date.parse(`${today}T12:00:00Z`);
  const dates = [0, 1, 2, 3, 4].map((i) => new Date(base + i * DAY_MS).toISOString().slice(0, 10));
  const days = dates.map((d) => farmDay(perParcel, d));
  const now = days[0];
  const src = provenance(perParcel, Date.now());
  const any = days.some((d) => d !== undefined);
  const val = (n: number | undefined, key: 'wx.kmh' | 'wx.pct'): string => (n === undefined ? DASH : t(key, { v: formatQty(n) }));
  return (
    <section class="wx dark" data-testid="weather-strip" aria-label={t('today.weather')}>
      <h2>{t('today.weather')}</h2>
      {!any && <p class="wx-none" data-testid="wx-none">{t('today.weather.setup')}</p>}
      {any && <div class="tiles">
        <div class="tile"><small>{t('wx.maxmin')}</small><strong data-testid="wx-now-temp">{now && now.tmax !== undefined && now.tmin !== undefined ? t('wx.temp', { min: formatQty(now.tmin), max: formatQty(now.tmax) }) : DASH}</strong></div>
        <div class="tile"><small>{t('wx.wind')}</small><strong>{val(now?.wind, 'wx.kmh')}</strong>{now?.gust !== undefined && <small>{t('wx.gust', { kmh: formatQty(now.gust) })}</small>}</div>
        <div class="tile"><small>{t('wx.humidity')}</small><strong>{val(now?.rh, 'wx.pct')}</strong></div>
        <div class="tile"><small>{t('wx.rain.today')}</small><strong>{now?.rain === undefined ? DASH : t('wx.rain', { mm: formatQty(now.rain) })}</strong></div>
      </div>}
      {any && <div class="wx-row">
        {dates.map((date, i) => {
          const d = days[i];
          return (
            <div class={i === 0 ? 'd today' : 'd'} key={date} data-testid="wx-day">
              <span class="dn">{dayLabel(date)}</span>
              <span class="t" data-testid="wx-temp">{d && d.tmin !== undefined && d.tmax !== undefined ? t('wx.temp', { min: formatQty(d.tmin), max: formatQty(d.tmax) }) : DASH}</span>
              <span class="r" data-testid="wx-rain">{d && d.rain !== undefined ? t('wx.rain', { mm: formatQty(d.rain) }) : DASH}</span>
            </div>
          );
        })}
      </div>}
      {any && src && (
        <p class="wx-source" data-testid="wx-source">{sourceLine(src)}{src.stale && <strong data-testid="wx-stale"> {t('wx.stale')}</strong>}</p>
      )}
    </section>
  );
}

/** One line for a field card: today's weather of THAT parcel (information only). Nothing when there is no data. */
function fieldWeather(days: readonly Day[], today: string): string {
  const d = dayOf(days, today);
  if (!d || d.tmin === undefined || d.tmax === undefined) return '';
  const rain = d.rain !== undefined ? t('wx.rain', { mm: formatQty(d.rain) }) : '';
  const gust = d.gust !== undefined ? t('wx.gust', { kmh: formatQty(d.gust) }) : '';
  return [t('wx.temp', { min: formatQty(d.tmin), max: formatQty(d.tmax) }), rain, gust].filter((x) => x !== '').join(' · ');
}

/** First start: three short steps, in the order the farmer will do them. */
const WELCOME = [['welcome.1', 'welcome.1.body'], ['welcome.2', 'welcome.2.body'], ['welcome.3', 'welcome.3.body']] as const;
function Welcome() {
  return (
    <ol class="welcome card" data-testid="welcome">
      {WELCOME.map(([title, body], i) => <li key={title}><span class="step" aria-hidden="true">{i + 1}</span><div><strong>{t(title)}</strong><small>{t(body)}</small></div></li>)}
    </ol>
  );
}

const LINE = {
  free: { cls: 'badge calm', key: 'cut.line.free' },
  from: { cls: 'badge blocked', key: 'cut.line.from' },
  unknown: { cls: 'badge unsigned', key: 'cut.line.unknown' },
} as const;
const sourceText = (src: CutLine['source']): string => t(src === 'manual' ? 'cut.source.manual' : 'cut.source.label');
const lineText = (l: CutLine): string => (l.state === 'from' ? t(LINE.from.key, { d: formatDateTime(l.at) }) : t(LINE[l.state].key));

/** «Κοπή σήμερα»: one line per growing planting (green free, red waiting until a date, amber waiting period missing); a parcel with nothing growing says so. */
const FOLD_FREE_FROM = 4;   // from this many «free to cut» rows on, they fold into one line (fewer stay as they are)

function CutRow({ l }: { l: CutToday['lines'][number] }) {
  return (
    <div class="card cutline" data-testid="cut" data-state={l.state}>
      <div class="field-head"><strong>{l.crop}</strong><span class="muted">{l.parcel}</span></div>
      <span class={LINE[l.state].cls} data-testid="cut-line">{lineText(l)}</span>
      {l.state === 'from' && <small data-testid="cut-source">{sourceText(l.source)}</small>}
      {l.late && <span class="badge warn" data-testid="cut-late">{t('cut.late')}</span>}
    </div>
  );
}

/** Σήμερα → «Κοπή»: the rows that need attention (waiting period running, unknown) come FIRST and are never folded; many «free to cut» rows fold into one line that opens on a tap. Presentation only: same rows, same states. */
/** The two numbers of the day (design sprint D11): how many plantings can be cut today (eligible only; the held and the unknown are named, never added) and the crates LOGGED in 7 days with a small line of the logged days. Nothing here is estimated. */
function TodayNumbers({ ct, harvests }: { ct: CutToday; harvests: readonly Row[] }) {
  const free = ct.lines.filter((l) => l.state === 'free').length;
  const others = ct.lines.length - free;
  const nowIso = new Date().toISOString();
  const logged = cratesLogged(harvests, nowIso, 7);
  const unit = tn('ui.today.plantings', free);
  const held = others > 0 ? t('ui.today.holdUnknown', { n: formatQty(others) }) : '';
  return (
    <section class="today-numbers" data-testid="today-numbers">
      <div>
        <BigNum caption={t('ui.today.forCut')} value={formatQty(free)} unit={unit} />
        {held !== '' && <small class="ds-muted" data-testid="today-held">{held}</small>}
      </div>
      <div data-testid="today-cut7-big">
        <BigNum caption={t('ui.today.cut7')} value={logged === undefined ? undefined : formatQty(logged)} />
        <Sparkline values={cratesPerDay(harvests, nowIso, 7)} caption={t('ui.today.perDay')} />
      </div>
    </section>
  );
}

function CutTodaySection({ ct }: { ct: CutToday }) {
  const blocked = ct.lines.filter((l) => l.state !== 'free').length;
  const attention = ct.lines.filter((l) => l.state !== 'free');
  const free = ct.lines.filter((l) => l.state === 'free');
  const fold = free.length >= FOLD_FREE_FROM;
  return (
    <section data-testid="cut-today" aria-label={t('cut.today')}>
      <h2>{t('cut.today')}</h2>
      {ct.lines.length > 0 && <p class="muted" data-testid="cut-headline">{t('cut.headline', { n: blocked, total: ct.lines.length })}</p>}
      {attention.map((l) => <CutRow key={l.id} l={l} />)}
      {fold && <details class="fold" data-testid="cut-free-group"><summary>{t('cut.free.n', { n: free.length })}</summary>{free.map((l) => <CutRow key={l.id} l={l} />)}</details>}
      {!fold && free.map((l) => <CutRow key={l.id} l={l} />)}
      {ct.noPlanting.map((p) => (
        <div class="card cutline" key={String(p.id)} data-testid="cut-empty"><div class="field-head"><strong>{text(p.name)}</strong><span class="muted">{t('cut.none')}</span></div></div>
      ))}
    </section>
  );
}

const cropLabel = (slug: string): string => { const c = CATALOG.find((x) => x.slug === slug); return c ? cropName(c, lang.value) : slug; };
const CHIP = { missing: { cls: 'badge blocked', key: 'tomorrow.missing' }, covered: { cls: 'badge neutral', key: 'tomorrow.covered' }, surplus: { cls: 'badge unsigned', key: 'tomorrow.surplus' } } as const;

/** «Αύριο φεύγουν»: tomorrow's orders (crop × crates, from the Κλούβες import of THIS farm) against the crates actually cut today, with ONE status chip per crop. A planting held by a waiting period never counts as supply. Information only. */
function TomorrowSection({ rows }: { rows: { crops: readonly Row[]; plantings: readonly Row[]; links: readonly Row[]; sprays: readonly Row[]; harvests: readonly Row[]; labels: readonly Row[] } }) {
  const [data, setData] = useState<{ orders: KlouvesOrders | undefined; map: Record<string, string> } | undefined>(undefined);
  const [tick, setTick] = useState(Date.now());
  const farm = activeFarm.value;
  useEffect(() => { let live = true; void loadOrders(db, farm).then((r) => { if (live) setData(r); }); return () => { live = false; }; }, [farm, dataVersion.value]);
  useEffect(() => { const id = setInterval(() => setTick(Date.now()), 60_000); return () => clearInterval(id); }, []);   // the Athens midnight moves «tomorrow» on by itself
  if (!data) return null;
  const today = athensToday(new Date(tick)) ?? '';
  if (!data.orders?.days) return <section data-testid="tomorrow"><h2>{t('tomorrow.title')}</h2><p class="muted" data-testid="tomorrow-noimport">{t('tomorrow.noimport')}</p></section>;
  const supply = supplyByCrop(new Date(tick).toISOString(), rows.crops, rows.plantings, rows.links, rows.sprays, rows.harvests, rows.labels);
  const board = tomorrowBoard(data.orders, data.map, supply, cutTodayBySlug(today, rows.harvests, rows.plantings, rows.crops), nextDay(today));
  return (
    <section data-testid="tomorrow">
      <h2>{t('tomorrow.title')}</h2>
      {board.rows.length === 0 && <p class="muted" data-testid="tomorrow-none">{t('tomorrow.none')}</p>}
      {board.rows.map((r: BoardRow) => (
        <div class="card" key={r.slug} data-testid="tomorrow-row" data-state={r.state}>
          <div class="field-head"><strong>{cropLabel(r.slug)}</strong><span class={CHIP[r.state].cls} data-testid="tomorrow-chip">{t(CHIP[r.state].key, { n: fractionText(Math.abs(r.gap)) })}</span></div>
          <small data-testid="tomorrow-ordered">{t('tomorrow.line', { o: fractionText(r.ordered), c: fractionText(r.cut) })}</small>
          <small data-testid="tomorrow-supply">{t('tomorrow.supply', { free: r.free, held: r.held, unknown: r.unknown })}</small>
        </div>
      ))}
      {board.unmapped > 0 && <p class="muted" data-testid="tomorrow-unmapped">{t('tomorrow.unmapped', { n: board.unmapped })}</p>}
    </section>
  );
}

export function Today() {
  const [spraying, setSpraying] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [harvesting, setHarvesting] = useState(false);
  const [harvested, setHarvested] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [planned, setPlanned] = useState(false);
  const [history, setHistory] = useState(false);
  useBack(spraying || harvesting || planning || history || sharing, () => { setSpraying(false); setHarvesting(false); setPlanning(false); setHistory(false); setSharing(false); }, spraying || harvesting || planning);
  const rows = [useRows('parcels'), useRows('plantings'), useRows('products'), useRows('stock_lots'), useRows('crops')];
  const [parcels, plantings, products, lots, crops] = rows;
  const labelRows = useRows('label_uses'); const jobs = useRows('jobs'); const workers = useRows('workers'); const links = useRows('job_plantings'); const sprays = useRows('job_spray');
  const weatherRows = useWeather();
  const weatherOf = new Map(weatherRows.map((w) => [w.parcel_id, parseDays(w.days)] as const));
  const harvestRows = useRows('job_harvest');
  const summary = todaySummary(athensToday(new Date()) ?? '', sprays.rows ?? [], harvestRows.rows ?? [], jobs.rows ?? [], (id) => text(workers.rows?.find((w) => w.id === id)?.name), (id) => nameOf(products.rows?.find((p) => p.id === id) ?? {}));
  const jobLine = (j: Row): string => [...new Set(links.rows?.filter((l) => l.job_id === j.id).map((l) => plantings.rows?.find((p) => p.id === l.planting_id)).filter((p): p is Row => !!p).map((p) => t('spray.planting', { crop: nameOf(crops.rows?.find((c) => c.id === p.crop_id) ?? {}), parcel: text(parcels.rows?.find((x) => x.id === p.parcel_id)?.name) })) ?? [])].concat(text(workers.rows?.find((w) => w.id === j.worker_id)?.name), typeof j.planned_for === 'string' && j.planned_for !== '' ? formatDate(j.planned_for) : '').filter(Boolean).join(' · ');
  const openJobs = (jobs.rows ?? []).filter((j) => !j.deleted_at && j.kind === 'spray' && j.status === 'planned');
  const jobGroups = groupJobs(openJobs, athensToday(new Date()) ?? '');
  const live = (q: Rows) => q.rows?.filter((r) => !r.deleted_at) ?? [];
  const demo = activeFarm.value !== realFarmId.value;
  const cropsInUse = demo ? live(crops).length : new Set(live(plantings).map((p) => p.crop_id)).size;
  const loaded = rows.every((q) => q.rows);
  const has = live(parcels).length + live(plantings).length + live(products).length + live(lots).length + (demo ? live(crops).length : 0) > 0;
  if (sharing) return <ShareCard onClose={() => setSharing(false)} />;
  if (planning) return <JobForm onDone={(saved) => { setPlanning(false); setPlanned(saved); }} />;
  if (harvesting) return <HarvestForm onDone={(saved) => { setHarvesting(false); setHarvested(saved); }} />;
  if (spraying) return <SprayForm onDone={(saved) => { setSpraying(false); setRecorded(saved); }} />;
  if (history) return <History readOnly={demo} onBack={() => setHistory(false)} />;

  const now = instantOf(new Date()) ?? '';
  const cards: FieldCard[] = live(parcels).map((p) => {
    const c = cutFromParcel(p.id, now, plantings.rows ?? [], links.rows ?? [], sprays.rows ?? [], labelRows.rows ?? []);
    const crops_ = [...new Set(live(plantings).filter((x) => x.parcel_id === p.id).map((x) => nameOf(crops.rows?.find((c2) => c2.id === x.crop_id) ?? {})))].join(', ');
    return { weather: fieldWeather(weatherOf.get(p.id) ?? [], athensToday(new Date()) ?? ''), p, state: c.state, at: c.state === 'from' ? c.at : '', late: c.state === 'from' && c.late === true, source: c.state === 'from' ? t(c.source === 'manual' ? 'cut.source.manual' : 'cut.source.label') : '', crops: crops_ };
  });
  const ct = cutToday(live(parcels), live(plantings), links.rows ?? [], sprays.rows ?? [], (id) => nameOf(crops.rows?.find((c2) => c2.id === id) ?? {}), now, labelRows.rows ?? []);
  const urgent = cards.find((c) => c.state === 'unknown') ?? cards.filter((c) => c.state === 'from').sort((a, b) => a.at.localeCompare(b.at))[0];
  const today = athensToday(new Date()) ?? '';
  return (
    <section class="today">
      <header class="today-head band">
        <p class="brand" data-testid="brand">{APP_NAME_EL}</p>
        <p class="date" data-testid="today-date">{today ? formatDate(today) : ''}</p>
        <Title k="today.title" />
        <p class="farm" data-testid="today-farm">{farmLabel(activeFarm.value)}</p>
        {loaded && has && <button type="button" class="share-btn" data-testid="share-open" aria-label={t('ui.share.button')} onClick={() => setSharing(true)}><Icon name="share" /></button>}
      </header>
      {rows.some((q) => q.failed) && <ErrorState onRetry={retry} />}
      {loaded && !has && <Welcome />}
      {loaded && !has && (
        <EmptyState art="parcels" message={t('welcome.start')} actionLabel={t('parcel.add')} onAction={() => { openParcelForm.value = true; tab.value = 'parcels'; }} secondLabel={t('more.loadDemo')} onSecond={() => void loadDemo()} />
      )}
      {loaded && has && urgent && (
        <section class="hero" data-testid="urgent" aria-label={t('today.urgent')}>
          <span class="kicker"><span aria-hidden="true">{BADGE[urgent.state].mark}</span>{SP}{t('today.urgent')}</span>
          <h2>{urgent.state === 'unknown' ? t('today.urgent.unknown', { parcel: text(urgent.p.name) }) : t('today.urgent.wait', { d: formatDate(urgent.at.slice(0, 10)), crop: urgent.crops.split(', ')[0] ?? '', parcel: text(urgent.p.name) })}</h2>
          <button class="btn lime" data-testid="urgent-action" onClick={() => setHistory(true)}>{t('today.urgent.action')}</button>
        </section>
      )}
      {loaded && has && <WeatherStrip perParcel={[...weatherOf.values()]} />}
      {loaded && has && <TodayNumbers ct={ct} harvests={harvestRows.rows ?? []} />}
      {loaded && has && (
        <div class="pair">
          <button class="btn big" data-testid="spray-open" onClick={() => setSpraying(true)}>{t('spray.add')}</button>
          <button class="btn big" data-testid="harvest-open" onClick={() => setHarvesting(true)}>{t('harvest.add')}</button>
        </div>
      )}
      {loaded && has && <CutTodaySection ct={ct} />}
      {loaded && has && <h2>{t('worker.jobs')}</h2>}
      {loaded && has && openJobs.length === 0 && <p class="muted" data-testid="jobs-none">{t('today.jobs.none')}</p>}
      {JOB_GROUPS.map(([key, label]) => jobGroups[key].length > 0 && (
        <section key={key} data-testid={`jobs-${key}`}>
          <h3 class={key === 'overdue' ? 'late' : undefined}>{t(label)}</h3>
          {jobGroups[key].map((j) => <div class="card" key={j.id} data-testid="job-planned">{jobLine(j)}</div>)}
        </section>
      ))}
      {loaded && has && <button class="btn" data-testid="job-open" onClick={() => setPlanning(true)}>{t('job.add.plus')}</button>}
      {loaded && has && <TomorrowSection rows={{ crops: crops.rows ?? [], plantings: plantings.rows ?? [], links: links.rows ?? [], sprays: sprays.rows ?? [], harvests: harvestRows.rows ?? [], labels: labelRows.rows ?? [] }} />}
      {planned && <p class="msg" role="status" data-testid="job-saved">{t('job.saved')}</p>}
      {harvested && <p class="msg" role="status" data-testid="harvest-saved">{t('harvest.saved')}</p>}
      {recorded && <p class="msg" role="status" data-testid="spray-saved">{t('spray.saved')}</p>}
      {loaded && has && (
        <section class="kpis" data-testid="today-kpis">
          <div class="kpi"><small>{t('today.kpi.parcels')}</small><strong>{formatQty(live(parcels).length)}</strong></div>
          <div class="kpi"><small>{t('today.kpi.crops')}</small><strong>{formatQty(cropsInUse)}</strong></div>
          <div class="kpi" data-testid="today-cut7"><small>{t('today.kpi.cut7')}</small><strong>{formatQty(cutCrates(harvestRows.rows ?? [], new Date().toISOString(), 7))}</strong></div>
          <div class="kpi" data-testid="today-cut28"><small>{t('today.kpi.cut28')}</small><strong>{formatQty(cutCrates(harvestRows.rows ?? [], new Date().toISOString(), 28))}</strong></div>
          <div class="kpi wide" data-testid="today-canharvest"><small>{t('today.kpi.harvest')}</small><strong>{formatQty(ct.freeParcels)}</strong><small>{t('today.kpi.held', { n: ct.heldParcels })}</small></div>
        </section>
      )}
      {loaded && has && (
        <section class="card" data-testid="today-who">
          <strong>{t('today.who')}</strong>
          {summary.done.length === 0 && summary.harvests === 0 && summary.overdue.length === 0 && <small data-testid="today-who-none">{t('today.who.none')}</small>}
          {summary.done.map((d) => <small key={d.sprayId} data-testid="today-who-done">{t('today.who.done', { worker: d.worker || t('value.unknown'), product: d.product })}</small>)}
          {summary.harvests > 0 && <small data-testid="today-who-crates">{t('today.who.crates', { n: formatQty(summary.crates) })}</small>}
          {summary.overdue.length > 0 && <small class="late" data-testid="today-who-overdue">{t('today.who.overdue', { n: summary.overdue.length })}</small>}
        </section>
      )}
      {loaded && has && <button class="row" data-testid="history-open" onClick={() => setHistory(true)}><span>{t('history.title')}</span><span aria-hidden="true" class="chev" /></button>}
      {loaded && has && <p class="card" data-testid="today-counts">{t('today.counts', { parcels: live(parcels).length, crops: formatQty(cropsInUse), plantings: formatQty(live(plantings).length) })}</p>}
    </section>
  );
}
