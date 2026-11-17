declare const t: (k: string) => string;
declare const n: number;
declare const cond: boolean;
declare const label: string;
declare const props: Record<string, string>;
declare const items: string[];
declare const Comp: (p: { text?: string; value?: string; label?: string; children?: unknown }) => unknown;
const msg = 'Hello';
const html = '<b>x</b>';
export const a1 = () => <p>{msg}</p>;  // @limit text kept in a variable, rendered later
export const a2 = () => <p>{[msg, 'x'].join(' ')}</p>; // @red U02
export const a3 = () => <p>{String.raw`Hi`}</p>; // @red U02
export const a4 = () => <p>{(5).toString()}</p>; // @ok
export const a5 = () => <p {...{ title: 'Hi' }} />; // @red U03
export const a6 = () => <p title={msg} />; // @red U03
export const a7 = () => <input value="Hello" />;  // @limit arbitrary custom prop
export const a8 = () => <Comp label="Hello" />; // @red U03
export const a9 = () => <Comp text="Hello" />;  // @limit arbitrary custom prop
export const b1 = () => <option value="a">{t('x')}</option>; // @ok
export const b2 = () => <p>{`Hi ${n}`}</p>; // @red U02
export const b3 = () => <p>{'a' + 'b'}</p>; // @red U02
export const b4 = () => <p>{t('a') + ' κλούβες'}</p>; // @red U02
export const b5 = () => <p>{cond ? t('a') : 'No'}</p>; // @red U02
export const b6 = () => <p>{cond ? t('a') : cond ? t('b') : 'No'}</p>; // @red U02
export const b7 = () => <p>{cond && cond && 'Yes'}</p>; // @red U02
export const b8 = () => <p>{(cond, 'Yes')}</p>; // @red U02
export const b9 = () => <p>{'Yes' as string}</p>; // @red U02
export const c1 = () => <p>{'Yes'!}</p>; // @red U02
export const c2 = () => <p>{items.map(() => 'x')}</p>; // @red U02
export const c3 = () => <ul>{items.map((i) => <li>{i}</li>)}</ul>;  // @limit text from data/variables
export const c4 = () => <p>{['a', 'b']}</p>; // @red U02
export const c5 = () => <p>{{ a: 1 }.a.toString() + 'x'}</p>; // @red U02
export const c6 = () => <p>{label}</p>;  // @limit text kept in a variable/prop
export const c7 = () => <p>{<>{'x'}</>}</p>; // @red U02
export const c8 = () => <p>{cond ? <b>{'x'}</b> : null}</p>; // @red U02
export const c9 = () => <p {...props} />;  // @limit spread of an untyped props object
export const d1 = () => <Comp {...{ label: 'Hi' }} />; // @red U03
export const d2 = () => <p aria-label={t('a') + 'x'} />; // @red U03
export const d3 = () => <p aria-label={cond ? t('a') : `x`} />; // @red U03
export const d4 = () => <p aria-label={['x'].join('')} />; // @red U03
export const d5 = () => <p aria-label={msg} />; // @red U03
export const d6 = () => <p aria-label={'a'.toUpperCase()} />; // @red U03
export const d7 = () => <p aria-label={cond ? (cond ? 'a' : 'b') : 'c'} />; // @red U03
export const d8 = () => <p aria-label={(cond && 'a') || 'b'} />; // @red U03
export const d9 = () => <p AriaLabel="x" />; // @ok
export const e1 = () => <p ariaLabel="x" />; // @red U03
export const e2 = () => <p aria-valuetext="x" />; // @red U03
export const e3 = () => <p aria-live="polite" role="status">{t('a')}</p>; // @ok
export const e4 = () => <p aria-label={t('a')} />; // @ok
export const e5 = () => <input type="text" name="phi" value={n} />; // @ok
export const e6 = () => <p dangerouslySetInnerHTML={{ __html: html }} />; // @red U04
export const e7 = (el: HTMLElement) => { el['innerHTML'] = html; }; // @red U04
export const e8 = (el: HTMLElement) => { el.append('x'); }; // @red U04
export const e9 = (el: HTMLElement) => { el.replaceChildren('x'); }; // @red U04
export const f1 = (el: HTMLElement) => { el.insertAdjacentHTML('beforeend', html); }; // @red U04
export const f2 = (el: HTMLElement) => { el.setAttribute('aria-label', 'x'); }; // @red U04
export const f3 = (el: HTMLElement) => { document.title = 'x'; }; // @red U04
export const f4 = (el: HTMLInputElement) => { el.placeholder = 'x'; }; // @red U04
export const f5 = (el: HTMLElement) => { el.innerText += 'x'; }; // @red U04
export const f6 = (el: HTMLElement) => { el.nodeValue = 'x'; }; // @red U04
export const f7 = () => document.write('x'); // @red U04
export const f8 = () => { const a = alert; a('x'); }; // @red U05
export const f9 = () => { const w = window as any; w['alert']('x'); }; // @red R07
export const g1 = () => (window as any).alert('x'); // @red U05
export const g2 = () => { const { confirm: c } = window; return c('x'); }; // @red U05
export const g3 = () => globalThis['prompt']('x'); // @red R07
export const g4 = () => Reflect.apply(alert, window, ['x']); // @red U05
export const g5 = () => <Comp>{'text'}</Comp>; // @red U02
export const g6 = () => <Comp children="x" />; // @red U04
export const g7 = () => <p>{`
`}</p>; // @ok
export const g8 = () => <p>&nbsp;</p>;  // @ok
export const g9 = () => <p>{' '}</p>;  // @ok
export const h1 = () => <p>{'   '}</p>; // @ok
export const h2 = () => <img src="/a.png" alt="" />; // @ok
export const h3 = () => <p class="a b" data-x={`x-${n}`}>{t('a')}</p>; // @ok
export const h4 = () => <p style={{ width: `${n}px` }}>{t('a')}</p>; // @ok
export const h5 = () => <p>{n}</p>; // @ok
export const h6 = () => <p>{t(`k.${n}`)}</p>;  // @red U02
export const h7 = () => <p>{cond ? t('a') : t('b')}</p>; // @ok
export const h8 = () => <p>{cond && t('a')}</p>; // @ok
export const h9 = () => <p>{cond ? 'x' : 'y'}</p>; // @red U02
