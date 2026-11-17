// W01: the single write path. Writing to a Dexie table/collection anywhere else (outside src/repo and src/db) is red.
import type { Table } from 'dexie';
declare const t: Table<{ id: string }, string>;
declare const m: Map<string, number>;
export const a = () => t.put({ id: 'x' }); // @red W01
export const b = () => t.add({ id: 'x' }); // @red W01
export const c = () => t.delete('x'); // @red W01
export const d = () => t.clear(); // @red W01
export const e = () => t.where('id').equals('x').delete(); // @red W01
export const f = () => t.bulkPut([{ id: 'x' }]); // @red W01
export const g = () => t['put']({ id: 'x' }); // @red W01
export const h = () => t.get('x'); // @ok
export const i = () => m.delete('x'); // @ok
export const j = () => new Set<string>().add('x'); // @ok
export const k = () => t.where('id').equals('x').toArray(); // @ok
