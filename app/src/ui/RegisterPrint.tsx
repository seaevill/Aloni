import { printRegisterLines } from '../export/register-pdf';
import type { RegisterData } from '../export/register';
import { t, type I18nKey } from '../i18n';
import './register-print.css';

export function RegisterPrint({ data, demo, name, address, phone, vat }: {
  data: RegisterData; demo: boolean; name: string; address: string; phone: string; vat: string;
}) {
  const rows = printRegisterLines(data);
  const unknown = t('ui.pdf.unknown', undefined, 'el');
  const own = (value: string) => !demo && value.trim() ? value : unknown;
  const fact = (key: I18nKey, value: string) => t('labeluse.line', { name: t(key, undefined, 'el'), value }, 'el');
  return <section class="register-print" data-testid="register-print-page" lang="el">
    <h1>{t('register.title', undefined, 'el')}</h1>
    <p>{t('register.draft', undefined, 'el')}</p>
    {demo && <p>{t('badge.demo', undefined, 'el')}</p>}
    <p>{t('register.holder', { name: own(name), vat: own(vat) }, 'el')}</p>
    <p>{t('ui.pdf.contact', { address: own(address), phone: own(phone) }, 'el')}</p>
    {!rows.length ? <p>{t('register.empty', undefined, 'el')}</p> : <table>
      <thead><tr>
        <th scope="col">{t('register.col.when', undefined, 'el')}</th>
        <th scope="col">{t('ui.pdf.place', undefined, 'el')}</th>
        <th scope="col">{t('register.col.product', undefined, 'el')}</th>
        <th scope="col">{t('register.col.dose', undefined, 'el')}</th>
        <th scope="col">{t('register.col.label', undefined, 'el')}</th>
        <th scope="col">{t('register.col.applicator', undefined, 'el')}</th>
        <th scope="col">{t('ui.pdf.wait', undefined, 'el')}</th>
      </tr></thead>
      <tbody>{rows.map((row, index) => <tr key={`${row.record}-${index}`}>
        <td>{row.when}<br />{fact('register.col.start', row.start)}</td>
        <td>{row.locations.map((location, i) => <div key={i}>
          {location.parcel}<br />{location.crop}<br />
          {fact('register.col.area', location.area)}
        </div>)}</td>
        <td>{row.product}<br />{fact('register.col.reg_no', row.reg_no)}</td>
        <td><span data-testid="register-print-dose">{row.dose}</span> {row.unit}</td>
        <td>{row.label}</td><td>{row.applicator}</td>
        <td>{fact('register.col.phi_until', row.phi_until)}<br />
          {fact('register.col.rei_until', row.rei_until)}</td>
      </tr>)}</tbody>
    </table>}
  </section>;
}
