import type { MoneyPrintData } from '../money/print';
import { t } from '../i18n';
import './money-print.css';

/** The printed «Ταμείο» of one year (always Greek, hidden on screen). The browser's print dialog turns it into a PDF. Not official books, and unsigned. */
export function MoneyPrint({ data, year, demo }: { data: MoneyPrintData; year: string; demo: boolean }) {
  const el = (key: Parameters<typeof t>[0], vars?: Record<string, string>) => t(key, vars, 'el');
  const totals = [el('ui.money.in.total', { v: `${data.inTotal} €` }), el('ui.money.out.total', { v: `${data.outTotal} €` }), `${el('ui.money.net', { year })}: ${data.netTotal} €`].join(' · ');
  return <section class="money-print" data-testid="money-print-page" lang="el">
    <h1>{`${el('ui.money.title')} ${year}`}</h1>
    <p>{el('ui.money.export.draft', { year })}</p>
    {demo && <p>{el('badge.demo')}</p>}
    <p data-testid="money-print-totals">{totals}</p>
    <table>
      <thead><tr>
        <th scope="col">{el('ui.money.date')}</th>
        <th scope="col">{el('ui.money.dir')}</th>
        <th scope="col">{el('ui.money.category')}</th>
        <th scope="col">{el('ui.money.crop')}</th>
        <th scope="col">{el('ui.money.col.amount')}</th>
        <th scope="col">{el('ui.money.note')}</th>
      </tr></thead>
      <tbody>{data.lines.map((l) => <tr key={l.record} data-testid="money-print-row">
        <td>{l.day}</td><td>{l.dir}</td><td>{l.category}</td><td>{l.crop}</td><td data-testid="money-print-amount">{l.amount}</td><td>{l.note}</td>
      </tr>)}</tbody>
    </table>
  </section>;
}
