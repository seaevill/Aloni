import { t } from '../i18n';
import { COLUMNS, registerLines, type RegisterData, type RegisterLine } from './register';

type PrintLine = RegisterLine & { locations: Array<Pick<RegisterLine, 'parcel' | 'crop' | 'area'>> };

export function printRegisterLines(data: RegisterData): PrintLine[] {
  const unknown = t('ui.pdf.unknown', undefined, 'el');
  const rows = registerLines(data, {
    when: (value) => value, num: (value) => value, unit: (value) => value,
    flag: (value) => value,
    name: (row) => String(row.name_el ?? row.name ?? ''),
    label: (state) => {
      if (state === 'signed') return t('register.label.signed', undefined, 'el');
      if (state === 'unsigned') return t('labeluse.status.unsigned', undefined, 'el');
      if (state === 'changed') return t('labeluse.status.changed', undefined, 'el');
      if (state === 'blocked') return t('spray.flag.label_blocked', undefined, 'el');
      if (state === 'none') return t('spray.flag.label_none', undefined, 'el');
      return '';
    },
  });
  const byRecord = new Map<string, PrintLine>();
  for (const line of rows) {
    for (const column of COLUMNS) if (!line[column].trim()) line[column] = unknown;
    const location = { parcel: line.parcel, crop: line.crop, area: line.area };
    const existing = byRecord.get(line.record);
    if (existing) existing.locations.push(location);
    else byRecord.set(line.record, { ...line, locations: [location] });
  }
  return [...byRecord.values()];
}
