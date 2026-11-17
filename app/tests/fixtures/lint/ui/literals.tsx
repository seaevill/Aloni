export const A = () => <p>Hardcoded text</p>;
export const B = (p: { x: boolean }) => <p>{p.x ? 'Yes' : 'No'}</p>;
export const C = () => <button aria-label="Close">{'Close'}</button>;
export const D = (p: { x: boolean }) => <p aria-current={p.x ? 'page' : undefined}>{String(p.x)}</p>; // allowed
