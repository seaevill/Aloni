// Fixture: U01-U05 (all user-facing text goes through t()).
declare const t: (k: string) => string;
declare const n: number;
declare const cond: boolean;
export const a = () => <p>Hardcoded text</p>; // @red U01
export const b = () => <p>·</p>; // @red U01
export const c = () => <p>{'Hardcoded'}</p>; // @red U02
export const d = () => <p>{`Hardcoded`}</p>; // @red U02
export const e = () => <p>{cond ? 'Yes' : 'No'}</p>; // @red U02
export const f = () => <p>{cond && 'Visible text'}</p>; // @red U02
export const g = () => <p>{n + ' κλούβες'}</p>; // @red U02
export const h = () => <>{'fragment text'}</>; // @red U02
export const i = () => <p>{`${n} κλούβες`}</p>; // @red U02
export const j = () => <p>{cond ? (n ? 'a' : 'b') : t('x')}</p>; // @red U02
export const k = () => <p>{[t('a'), 'b'].join(' · ')}</p>; // @red U02
export const l = () => <p>{t('a').concat(' κλούβες')}</p>; // @red U02
export const m = () => <p>{cond || 'fallback text'}</p>; // @red U02
export const o = () => <button aria-label="Close">x</button>; // @red U03
export const p = () => <button aria-label={'Close'}>{t('x')}</button>; // @red U03
export const q = () => <button aria-label={`Close`}>{t('x')}</button>; // @red U03
export const r = () => <button aria-description="Closes it">{t('x')}</button>; // @red U03
export const s = () => <input placeholder={cond ? 'Search' : 'Find'} />; // @red U03
export const u = () => <img alt={n + ' pieces'} />; // @red U03
export const v = () => <input title="Hint" />; // @red U03
export const w = () => <p dangerouslySetInnerHTML={{ __html: 'x' }} />; // @red U04
export const x = (el: HTMLElement) => { el.textContent = 'x'; }; // @red U04
export const y = (el: HTMLElement) => { el.innerHTML = '<b>x</b>'; }; // @red U04
declare const h: (...a: unknown[]) => unknown;
export const z = () => h('p', null, 'text'); // @red U04
export const aa = () => <p children="text" />; // @red U04
export const ab = () => alert('x'); // @red U05
export const ac = () => confirm('Sure?'); // @red U05
export const ad = () => window.prompt('x'); // @red U05
// legitimate code must stay green:
export const ok1 = () => <p>{t('a')}</p>; // @ok
export const ok2 = () => <p aria-current={cond ? 'page' : undefined}>{t('a')}</p>; // @ok
export const ok3 = () => <p class={`btn ${cond ? 'on' : 'off'}`}>{t('a')}</p>; // @ok
export const ok4 = () => <p>{t('a')}{n}</p>; // @ok
export const ok5 = (xs: string[]) => <ul>{xs.map((s) => <li key={s}>{s}</li>)}</ul>; // @ok
export const ok6 = () => <input type="text" aria-label={t('a')} />; // @ok
export const ok7 = () => <p>{cond ? t('a') : t('b')}</p>; // @ok
export const ok8 = (rows: { id: string }[]) => <p>{rows.filter((r) => r.id === 'x').length}</p>; // @ok
