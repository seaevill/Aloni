import type { Snapshot } from '../fieldwork/fieldwork';
import { t } from '../i18n';
import { formatQty } from '../i18n/format';

/** «Weather that day: …» from a stored snapshot; unknown when there is none (nothing is invented). */
export const weatherLine = (w: Snapshot | undefined): string => {
  if (w === undefined) return t('ui.work.wx.unknown');
  const parts = [
    w.tmin !== undefined && w.tmax !== undefined ? t('wx.temp', { min: formatQty(w.tmin), max: formatQty(w.tmax) }) : '',
    w.rain !== undefined ? t('wx.rain', { mm: formatQty(w.rain) }) : '',
    w.gust !== undefined ? t('wx.gust', { kmh: formatQty(w.gust) }) : '',
  ].filter((x) => x !== '');
  return t('ui.work.wx', { v: parts.join(' · ') });
};
