// Safety rules from CLAUDE.md, enforced mechanically (see CODING_STANDARDS.md and eslint/bans.js).
import tseslint from 'typescript-eslint';
import { CLOCK, DEFAULTS, NO_INTL, ROUND, UI, toRule, withSelector } from './eslint/bans.js';
import noNumericDefault from './eslint/no-numeric-default.js';
import noGlobal from './eslint/no-global.js';

// ESLint does NOT merge `no-restricted-syntax` across blocks: the last matching block replaces earlier ones.
// So each file group below gets ONE complete list, and later blocks are supersets or deliberate exceptions.
const FIX = 'app/tests/fixtures/lint/**'; // seeded violations; only app/tests/unit/lint-guards.test.ts lints them
const APP_TS = ['app/src/**/*.{ts,tsx}', `${FIX}/dose/**/*.{ts,tsx}`];
const APP_TSX = ['app/src/**/*.tsx', `${FIX}/ui/**/*.tsx`];
const RULES_CORE = ['packages/rules-core/src/**/*.ts', `${FIX}/rules-core/**/*.ts`];
const FORMAT_FILE = ['app/src/i18n/format.ts']; // the ONLY file allowed to touch number formatting (R05), with its own tests

// Custom rules, one entry per use because a rule can be configured only once per block.
const CLOCK_GLOBALS = ['performance', 'setTimeout', 'setInterval', 'setImmediate', 'queueMicrotask', 'requestAnimationFrame', 'requestIdleCallback',
  'process', 'Atomics', 'globalThis', 'window', 'self', 'global', 'navigator', 'localStorage', 'sessionStorage', 'fetch', 'document', 'location',
  'WeakRef', 'FinalizationRegistry', 'Temporal', 'AbortSignal'];
const dose = {
  'aloni/no-numeric-default': 'error',
  'no-restricted-imports': ['error', { patterns: [{ group: ['lodash', 'lodash/*', 'lodash.*', 'mathjs', 'big.js', 'decimal.js', 'bignumber.js', 'numeral', 'accounting'], message: '[R08] No rounding/number libraries: numbers are shown only by i18n/format.ts.' }] }],
};
const clock = {
  'aloni/no-global-clock': ['error', { names: CLOCK_GLOBALS, message: '[K02] rules-core is pure: no timers, clocks, environment or global objects.' }],
  'aloni/no-global-random': ['error', { names: ['crypto'], message: '[K03] rules-core is deterministic: no crypto/randomness.' }],
  'no-restricted-imports': ['error', { patterns: [{ regex: '^(?!\\.{1,2}/)', message: '[K04] rules-core may import only relative files (no clock/random/number libraries).' }] }],
};
const ui = { 'aloni/no-global-dialog': ['error', { names: ['alert', 'confirm', 'prompt'], message: '[U05] No dialogs (alert/confirm/prompt): save at once and offer a 5 s undo.' }] };
const syntax = (bans, extra = {}) => ({ rules: { 'no-restricted-syntax': ['error', ...withSelector(bans).map(toRule)], ...extra } });
const typed = {
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
  },
  plugins: { '@typescript-eslint': tseslint.plugin, aloni: { rules: { 'no-numeric-default': noNumericDefault, 'no-global-clock': noGlobal, 'no-global-random': noGlobal, 'no-global-dialog': noGlobal } } },
};

export default [
  { ignores: ['**/dist/**', '**/dev-dist/**', '**/node_modules/**', '**/test-results/**', 'reference/**', 'app/tests/fixtures/**', 'eslint.config.js', 'eslint/**'] },
  { files: ['app/**/*.{ts,tsx}', 'packages/**/*.ts'], ...typed, rules: { '@typescript-eslint/no-floating-promises': 'error' } },
  { files: APP_TS, ...typed, ...syntax([...ROUND, ...DEFAULTS], dose) },
  { files: APP_TSX, ...typed, ...syntax([...ROUND, ...DEFAULTS, ...UI], { ...dose, ...ui }) },
  { files: RULES_CORE, ...typed, ...syntax([...ROUND, ...DEFAULTS, ...CLOCK], { ...dose, ...clock }) },
  { files: ['packages/rules-core/src/**/*.test.ts'], rules: { 'no-restricted-imports': 'off' } },
  { files: FORMAT_FILE, ...typed, ...syntax([...ROUND.filter(NO_INTL), ...DEFAULTS], dose) },
];
