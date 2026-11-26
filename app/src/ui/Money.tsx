import { useEffect, useRef, useState } from 'preact/hooks';
import { activeFarm, db } from '../db';
import { formatDate, formatMonth, lang, t, type I18nKey } from '../i18n';
import { formatMoney } from '../i18n/format';
import { athensToday } from '../plantings/planting';
import { CATALOG } from '../crops/catalog';
import { appendMoney, buildEntry, cancelled, categoriesOf, effective, historyOf, loadMoney, restoreOf, rootOf, voidOf, MONTHS, yearSummary, yearsOf, type Category, type Direction, type MoneyEntry } from '../money/ledger';
import { BackBar } from './BackBar';
import { useSubmit } from './useSubmit';
import { BigNum, Card, DetailSheet, ListRow, SheetFact } from './ds';
import { showUndo } from './Toast';

// Άλλα → «Ταμείο» (F1, docs/milestones/F1.md): the owner's own income/expense book, on THIS phone only. Not official bookkeeping (the screen says so).
// Rows are never edited or removed: «Διόρθωση» writes an amending row, «Ακύρωση» a void row, and «Αναίρεση» amends the void. Owner app only.
export const CAT_KEYS: Record<Category, I18nKey> = {
  sale: 'ui.money.cat.sale', subsidy: 'ui.money.cat.subsidy', vat_refund: 'ui.money.cat.vat_refund', other_in: 'ui.money.cat.other_in',
  seed: 'ui.money.cat.seed', fertiliser: 'ui.money.cat.fertiliser', ppp: 'ui.money.cat.ppp', labour: 'ui.money.cat.labour', fuel: 'ui.money.cat.fuel',
  water: 'ui.money.cat.water', power: 'ui.money.cat.power', repair: 'ui.money.cat.repair', rent: 'ui.money.cat.rent', packaging: 'ui.money.cat.packaging',
  transport: 'ui.money.cat.transport', equipment: 'ui.money.cat.equipment', fees: 'ui.money.cat.fees', other_out: 'ui.money.cat.other_out',
};
const signed = (e: MoneyEntry): string => (e.dir === 'in' ? formatMoney(e.cents) : formatMoney(-e.cents));
const cropName = (slug: string | undefined): string => { const c = CATALOG.find((x) => x.slug === slug); return c ? c[lang.value] : ''; };

type View = { kind: 'main' } | { kind: 'form'; dir: Direction; from?: MoneyEntry } | { kind: 'entry'; id: string };

export function Money({ onBack }: { onBack: () => void }) {
  const farm = activeFarm.value;
  const today = athensToday(new Date()) ?? '1970-01-01';
  const [rows, setRows] = useState<MoneyEntry[] | undefined>(undefined);
  const [year, setYear] = useState(today.slice(0, 4));
  const [view, setView] = useState<View>({ kind: 'main' });
  const reload = async () => setRows(await loadMoney(db, farm));
  useEffect(() => { void reload(); }, [farm]);
  if (rows === undefined) return null;
  const append = async (e: MoneyEntry) => { await appendMoney(db, farm, e); await reload(); };
  if (view.kind === 'form') return <EntryForm dir={view.dir} from={view.from} today={today} onBack={() => setView({ kind: 'main' })} onSave={async (e) => { await append(e); setYear(e.day.slice(0, 4)); setView({ kind: 'main' }); }} />;
  const s = yearSummary(rows, year);
  const live = effective(rows).filter((e) => e.day.startsWith(`${year}-`));
  const months = s.months.map((m, i) => ({ m, ym: [year, MONTHS[i]].join('-') })).filter(({ m }) => m.inCents > 0 || m.outCents > 0).reverse();
  const gone = cancelled(rows).filter((e) => e.day.startsWith(`${year}-`));
  const open = view.kind === 'entry' ? effective(rows).find((e) => e.id === view.id) : undefined;
  const cancel = async (e: MoneyEntry) => {
    const v = voidOf(e, crypto.randomUUID(), new Date().toISOString());
    await append(v); setView({ kind: 'main' });
    showUndo(t('ui.money.cancelled'), () => append(restoreOf(v, crypto.randomUUID(), new Date().toISOString())));
  };
  return (
    <section data-testid="money">
      <BackBar onBack={onBack} testId="money-back" />
      <h1 tabIndex={-1}>{t('ui.money.title')}</h1>
      <p class="draft" role="note" data-testid="money-notbooks">{t('ui.money.notbooks')}</p>
      <div class="seg" role="group" aria-label={t('ui.money.year')}>
        {yearsOf(rows, today.slice(0, 4)).map((y) => <button key={y} aria-pressed={year === y} data-testid={`money-year-${y}`} onClick={() => setYear(y)}>{y}</button>)}
      </div>
      <Card testid="money-total">
        <BigNum value={formatMoney(s.netCents)} caption={t('ui.money.net', { year })} />
        <p data-testid="money-in">{t('ui.money.in.total', { v: formatMoney(s.inCents) })}</p>
        <p data-testid="money-out">{t('ui.money.out.total', { v: formatMoney(s.outCents) })}</p>
      </Card>
      <div>
        <button class="btn" data-testid="money-add-in" onClick={() => setView({ kind: 'form', dir: 'in' })}>{t('ui.money.add.in')}</button>
        <button class="btn" data-testid="money-add-out" onClick={() => setView({ kind: 'form', dir: 'out' })}>{t('ui.money.add.out')}</button>
      </div>
      {live.length === 0 && <p class="muted" data-testid="money-none">{t('ui.money.none')}</p>}
      {live.length > 0 && <>
        <h2>{t('ui.money.months')}</h2>
        {months.map(({ m, ym }) => <ListRow key={ym} testid="money-month" heading={formatMonth(ym)} meta={t('ui.money.month.line', { in: formatMoney(m.inCents), out: formatMoney(m.outCents), net: formatMoney(m.netCents) })} />)}
        <h2>{t('ui.money.cats')}</h2>
        {s.byCategory.map((c) => <ListRow key={`${c.dir}:${c.category}`} testid="money-cat" heading={t(CAT_KEYS[c.category])} meta={formatMoney(c.dir === 'in' ? c.cents : -c.cents)} />)}
        <h2>{t('ui.money.entries')}</h2>
        {live.map((e) => <ListRow key={e.id} testid="money-entry" heading={`${signed(e)} · ${t(CAT_KEYS[e.category])}`} meta={[formatDate(e.day), cropName(e.crop), e.note].filter((x) => x !== '').join(' · ')} onClick={() => setView({ kind: 'entry', id: e.id })} />)}
        {gone.length > 0 && (
          <details class="fold" data-testid="money-cancelled">
            <summary>{t('ui.money.cancelled.list', { n: String(gone.length) })}</summary>
            {gone.map((e) => (
              <div key={e.id}>
                <ListRow testid="money-cancelled-entry" heading={`${signed(e)} · ${t(CAT_KEYS[e.category])}`} meta={formatDate(e.day)} />
                <button class="btn secondary" data-testid="money-restore" onClick={() => void append(restoreOf(e, crypto.randomUUID(), new Date().toISOString()))}>{t('toast.undo')}</button>
              </div>
            ))}
          </details>
        )}
      </>}
      <p class="muted" data-testid="money-local">{t('ui.money.local')}</p>
      {open && <DetailSheet heading={signed(open)} testid="money-sheet" onClose={() => setView({ kind: 'main' })}>
        <SheetFact name={t('ui.money.category')} value={t(CAT_KEYS[open.category])} />
        <SheetFact name={t('ui.money.date')} value={formatDate(open.day)} />
        {open.crop !== undefined && <SheetFact name={t('ui.money.crop')} value={cropName(open.crop)} />}
        {open.note !== '' && <SheetFact name={t('ui.money.note')} value={open.note} />}
        {historyOf(rows, rootOf(rows, open)).length > 1 && <>
          <h3>{t('ui.money.history')}</h3>
          {historyOf(rows, rootOf(rows, open)).map((h) => <HistoryLine key={h.id} h={h} />)}
        </>}
        <button class="btn" data-testid="money-correct" onClick={() => setView({ kind: 'form', dir: open.dir, from: open })}>{t('ui.money.correct')}</button>
        <button class="btn danger" data-testid="money-cancel" onClick={() => void cancel(open)}>{t('ui.money.cancel')}</button>
      </DetailSheet>}
    </section>
  );
}

function HistoryLine({ h }: { h: MoneyEntry }) {
  const key: I18nKey = h.void ? 'ui.money.history.void' : 'ui.money.history.line';
  return <p class="muted" data-testid="money-history-line">{t(key, { v: signed(h), day: formatDate(h.day) })}</p>;
}

function EntryForm({ dir, from, today, onBack, onSave }: { dir: Direction; from?: MoneyEntry; today: string; onBack: () => void; onSave: (e: MoneyEntry) => Promise<void> }) {
  const [amount, setAmount] = useState(from ? formatMoney(from.cents).replace(/\s€$/, '') : '');
  const [category, setCategory] = useState<string>(from ? from.category : '');
  const [day, setDay] = useState(from ? from.day : today);
  const [crop, setCrop] = useState(from?.crop !== undefined ? from.crop : '');
  const [note, setNote] = useState(from ? from.note : '');
  const [err, setErr] = useState<'amount' | 'day' | 'category' | undefined>(undefined);
  const head: I18nKey = from ? 'ui.money.correct' : dir === 'in' ? 'ui.money.add.in' : 'ui.money.add.out';
  const entryId = useRef(crypto.randomUUID()).current;       // ONE id per form: a second tap can never write a second row
  const guard = useSubmit();
  const submit = () => guard.submit(async () => {
    const r = buildEntry({ day, dir, category, amount, crop, note }, entryId, new Date().toISOString(), from?.id);
    if (!r.ok) { setErr(r.reason); return; }
    await onSave(r.entry);
  });
  return (
    <section data-testid="money-form">
      <BackBar onBack={onBack} testId="money-form-back" />
      <h1 tabIndex={-1}>{t(head)}</h1>
      <label class="field">{t('ui.money.amount')}<input class="input" inputMode="decimal" value={amount} autoComplete="off" data-testid="money-amount" onInput={(e) => setAmount((e.target as HTMLInputElement).value)} /></label>
      {err === 'amount' && <p class="msg error" role="alert" data-testid="money-error">{t('ui.money.err.amount')}</p>}
      <h2>{t('ui.money.category')}</h2>
      <div class="chips" role="group" aria-label={t('ui.money.category')}>
        {categoriesOf(dir).map((c) => <button key={c} type="button" class="tag-btn" aria-pressed={category === c} data-testid={`money-cat-${c}`} onClick={() => setCategory(c)}>{t(CAT_KEYS[c])}</button>)}
      </div>
      {err === 'category' && <p class="msg error" role="alert" data-testid="money-error">{t('ui.money.err.category')}</p>}
      <label class="field">{t('ui.money.date')}<input class="input" type="date" value={day} data-testid="money-day" onInput={(e) => setDay((e.target as HTMLInputElement).value)} /></label>
      {err === 'day' && <p class="msg error" role="alert" data-testid="money-error">{t('ui.money.err.day')}</p>}
      <h2>{t('ui.money.crop.optional')}</h2>
      <div class="chips" role="group" aria-label={t('ui.money.crop')}>
        {CATALOG.map((c) => <button key={c.slug} type="button" class="tag-btn" aria-pressed={crop === c.slug} data-testid={`money-crop-${c.slug}`} onClick={() => setCrop(crop === c.slug ? '' : c.slug)}>{c[lang.value]}</button>)}
      </div>
      <label class="field">{t('ui.money.note')}<input class="input" value={note} maxLength={80} autoComplete="off" data-testid="money-note" onInput={(e) => setNote((e.target as HTMLInputElement).value)} /></label>
      <p class="muted">{t('ui.money.note.hint')}</p>
      <button class="btn" data-testid="money-save" disabled={guard.busy} onClick={() => void submit()}>{t('ui.money.save')}</button>
    </section>
  );
}
