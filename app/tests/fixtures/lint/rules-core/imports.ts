// Fixture: K04 (rules-core imports only relative files; no clock/random/number libraries; no computed dynamic import; no import.meta).
import { v4 } from 'uuid'; // @red K04
import dayjs from 'dayjs'; // @red K04
import { helper } from './clean'; // @ok
export const a = () => v4() + String(dayjs()) + helper;
export const b = async (n: string) => import('./x' + n); // @red K04
export const c = () => import.meta.url; // @red K04
export const d = async () => import('./clean'); // @ok
