declare const t: (k: string, o?: unknown) => string;
declare const n: number;
declare const cond: boolean;
declare const items: string[];
declare const props: { label: string; children?: unknown };
declare const el: HTMLElement;
declare const html: (s: TemplateStringsArray) => unknown;
declare const Comp: (p: Record<string, unknown>) => unknown;
declare const Select: (p: { options: { label: string; value: number }[] }) => unknown;
const Hello = () => 'Hello';  // @limit a component that returns a string
export const a1 = () => <Select options={[{ label: 'Hello', value: 1 }]} />; // @red U03
export const a2 = () => <Comp label={{ text: 'Hello' }} />; // @red U03
export const a3 = () => <Comp render={() => 'Hello'} />; // @red U03
export const a4 = () => <p><Hello /></p>; // @ok
export const a5 = () => html`<p>Hello</p>`; // @red U04
export const a6 = () => { el.ariaLabel = 'Hello'; }; // @red U04
export const a7 = () => { el.outerText = 'Hello'; }; // @red U04
export const a8 = () => { el.replaceWith('Hello'); }; // @red U04
export const a9 = () => { el.appendChild(new Text('Hello')); }; // @red U04
export const b1 = () => new Option('Hello', 'v'); // @red U04
export const b2 = () => new Notification('Hello'); // @red U04
export const b3 = () => { Object.assign(el, { textContent: 'Hello' }); }; // @red D05
export const b4 = () => el.setHTMLUnsafe('<b>Hello</b>'); // @red U04
export const b5 = () => document.createRange().createContextualFragment('<b>x</b>'); // @red U04
export const b6 = () => <p {...Object.fromEntries([['title', 'Hello']])} />;  // @limit props built by a function call
export const b7 = () => <p {...{ [`title`]: 'Hello' }} />;  // @limit computed template-literal key
export const b8 = () => <p {...makeProps('Hello')} />;  // @limit props built by a function call
export const b9 = () => <p>{t('a') + (cond ? '!' : '')}</p>; // @red U02
export const c1 = () => <p>{`${t('a')}: ${n}`}</p>; // @red U02
export const c2 = () => <p>{String(n) + 'km'}</p>; // @red U02
export const c3 = () => <p>{n}{'km'}</p>; // @red U02
export const c4 = () => <p>{n} km</p>; // @red U01
export const c5 = () => <p>{props.children}</p>; // @ok
export const c6 = () => <p key="Hello">{t('a')}</p>; // @ok
export const c7 = () => <p>{/* note */}{t('a')}</p>; // @ok
export const c8 = () => <p>{`${t('a')} ${n}`}</p>; // @ok
export const c9 = () => <p>{`${t('a')}`}</p>; // @ok
export const d1 = () => <p>{t('a', { x: 'y' })}</p>; // @ok
export const d2 = () => <p title={t(`k.${n}`)} />; // @ok
export const d3 = () => <p>{String(n).padStart(2, '0')}</p>; // @ok
export const d4 = () => <p>{items.join(', ')}</p>;  // @red U02
export const d5 = () => <Comp label={props.label} />;  // @red U03
export const d6 = () => <p title={`${t('a')} ${t('b')}`} />; // @ok
export const d7 = () => <p aria-label={cond ? t('a') : t('b')} />; // @ok
export const d8 = () => <input type="number" value={n} onInput={() => undefined} />; // @ok
export const d9 = () => <select><option value="a">{t('a')}</option></select>; // @ok
export const e1 = () => <p>{items.map((i) => <b key={i}>{t(i)}</b>)}</p>; // @ok
export const e2 = () => <p>{cond ? <b>{t('a')}</b> : null}</p>; // @ok
export const e3 = () => <p style={{ width: `${n}px` }} class={cond ? 'a' : 'b'} />; // @ok
export const e4 = () => <p>{n}&nbsp;{t('a')}</p>; // @ok
export const e5 = () => <p>{n.toString()}</p>; // @ok
export const e6 = () => <p>{t('a')}{cond && <i>{t('b')}</i>}</p>; // @ok
export const e7 = () => <svg viewBox="0 0 1 1"><path d="M0 0" /></svg>; // @ok
export const e8 = () => <a href={`/x/${n}`} target="_blank" rel="noopener">{t('a')}</a>; // @ok
export const e9 = () => <p role="alert">{t('a')}</p>; // @ok
declare function makeProps(s: string): Record<string, string>;
