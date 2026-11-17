export const a = () => Date.now();
export const b = () => new Date();
export const c = () => Math.random();
export const d = (iso: string) => new Date(iso); // allowed: explicit input
