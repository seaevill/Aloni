// Fixture: R08 (no rounding/number libraries in app code).
import { round } from 'lodash'; // @red R08
import Big from 'big.js'; // @red R08
import { sum } from 'mathjs'; // @red R08
import { readFileSync } from 'node:fs'; // @ok
export const a = (x: number) => round(x) + sum([1, 2]) + readFileSync.length + Number(new Big(x));
