declare const t: (k: string) => string;
declare const cond: boolean;
declare const n: number;
export const a = () => <p>{t('a')}{' '}{t('b')}</p>; // @ok
export const b = () => <p>{t('a')}{' · '}{t('b')}</p>; // @red U02
export const c = () => <p>{t('a')} / {t('b')}</p>; // @red U01
export const d = () => <a href={'https://x.gr'} rel={'noopener'}>{t('a')}</a>; // @ok
export const e = () => <svg><text>{'x'}</text></svg>; // @red U02
export const f = () => <input type={cond ? 'text' : 'number'} />; // @ok
export const g = () => <label for="x">{t('a')}</label>; // @ok
export const h = () => <p data-label="x" aria-hidden="true">{t('a')}</p>; // @ok
export const i = () => <p class={cond ? 'a' : 'b'}>{t('a')}</p>; // @ok
export const j = () => <p>{n > 1 ? t('a') : t('b')}</p>; // @ok
export const k = () => <img alt={t('a')} src={`/i/${n}.png`} />; // @ok
export const m = () => <p>{[t('a'), t('b')].join('')}</p>; // @ok
export const o = () => <p>{[t('a'), t('b')].join(', ')}</p>; // @red U02
export const q = () => <p>{[t('a'), t('b')].join(' · ')}</p>; // @red U02
export const r = () => <p>{t('a').padEnd(3, '.')}</p>; // @red U02
export const s = () => <p>{`${t('a')}`}</p>; // @ok
export const u = () => <p>{`${t('a')}: ${n}`}</p>; // @red U02
