import { useState } from 'preact/hooks';
import { dataVersion, db } from '../db';
import { t } from '../i18n';
import { withSignOff } from '../labels/label-use';
import { athensToday } from '../plantings/planting';
import { put } from '../repo';
import type { Row } from '../db/schema';

/** Records that an agronomist approved EXACTLY these label values (name + real date). The app does not check the claim; editing any value removes it. */
export function SignOff({ row, onDone }: { row: Row; onDone: () => void }) {
  const [by, setBy] = useState('');
  const [on, setOn] = useState(athensToday(new Date()) ?? '');
  const [failed, setFailed] = useState<{ by: boolean; on: boolean } | undefined>(undefined);
  const save = async () => {
    const signed = withSignOff(row, by, on, new Date().toISOString());
    if (!signed) { setFailed({ by: by.trim() === '', on: by.trim() !== '' }); return; }
    await put(db, 'label_uses', signed);
    dataVersion.value++;
    onDone();
  };
  return (
    <div class="card" data-testid="signoff-form">
      <p class="muted">{t('signoff.note')}</p>
      <label class="field">{t('signoff.by')}
        <input class="input" value={by} autoComplete="off" onInput={(e) => setBy((e.target as HTMLInputElement).value)} />
      </label>
      {failed?.by && <p class="msg error" role="alert">{t('signoff.error.by')}</p>}
      <label class="field">{t('signoff.on')}
        <input class="input" type="date" value={on} onInput={(e) => setOn((e.target as HTMLInputElement).value)} />
      </label>
      {failed?.on && <p class="msg error" role="alert">{t('signoff.error.date')}</p>}
      <button class="btn" data-testid="signoff-save" onClick={() => void save()}>{t('product.save')}</button>
      <button class="btn secondary" onClick={onDone}>{t('product.cancel')}</button>
    </div>
  );
}
