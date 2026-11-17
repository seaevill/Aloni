import { v4 as uuid } from 'uuid'; // @red K04
import { nanoid } from 'nanoid'; // @red K04
import _ from 'lodash'; // @red K04
import dayjs from 'dayjs'; // @red K04
import { DateTime } from 'luxon'; // @red K04
import { hrtime } from 'node:process'; // @red K04
import { env } from 'node:process'; // @red K04
import fs from 'node:fs'; // @red K04
declare const d0: Date;
declare const dtf: Intl.DateTimeFormat;  // @red R05
declare const anyv: any;
class Fmt { format(): string { return 'x'; } }
export const a1 = uuid();  // @limit use of a banned import; the import line is red (K04)
export const a2 = nanoid();  // @limit use of a banned import; the import line is red (K04)
export const a3 = _.random(1, 5);  // @limit use of a banned import; the import line is red (K04)
export const a4 = dayjs();  // @limit use of a banned import; the import line is red (K04)
export const a5 = DateTime.now();  // @limit use of a banned import; the import line is red (K04)
export const a6 = hrtime.bigint();  // @limit use of a banned import; the import line is red (K04)
export const a7 = d0.constructor.now(); // @red K01
export const a8 = Object.getPrototypeOf(d0).constructor.now(); // @red K01
export const a9 = (d0.constructor as () => string)(); // @red K01
export const b1 = new Intl.DateTimeFormat('el').formatToParts(); // @red K01
export const b2 = dtf.format(...[]); // @red K01
export const b3 = dtf.format(void 0); // @red K01
export const b4 = Reflect.apply(dtf.format, dtf, []); // @red K01
export const b5 = new Intl.DateTimeFormat().resolvedOptions().timeZone; // @red K01
export const b6 = d0.getTimezoneOffset(); // @red K01
export const b7 = AbortSignal.timeout(100); // @red K02
export const b8 = new WeakRef({}).deref(); // @red K02
export const b9 = import.meta.env.MODE; // @red K04
export const c1 = navigator.language; // @red K02
export const c2 = localStorage.getItem('a'); // @red K02
export const c3 = fetch('/x'); // @red K02
export const c4 = document.title; // @red K02
export const c5 = await import('no' + 'de:crypto'); // @red K04
export const c6 = new FinalizationRegistry(() => undefined); // @red K02
export const c7 = Math['ra' + 'ndom'](); // @red R01
export const c8 = new Date(Date.UTC(2026, 0, 1)); // @ok
export const c9 = Date.UTC(2026, 0, 1); // @ok
export const d1 = new Intl.DateTimeFormat('el', { timeZone: 'Europe/Athens' }).format(d0); // @ok
export const d2 = Symbol('x').description; // @ok
export const d3 = new Fmt().format();  // @red K01
export const d4 = (window2: { from: number; to: number }) => window2.to - window2.from; // @ok
export const d5 = (r: { process: () => number }) => r.process(); // @ok
export const d6 = (s: { performance: number }) => s.performance; // @ok
export const d7 = (d: Date) => d.getTime() + 86400000; // @ok
export const d8 = (a: string[]) => [...a].sort(); // @ok
export const d9 = (d: Date) => new Date(d.getTime()); // @ok
