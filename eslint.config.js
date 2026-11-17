// Safety rules from CLAUDE.md, enforced mechanically (see CODING_STANDARDS.md and eslint/bans.js).
import tseslint from 'typescript-eslint';
import { CLOCK, DEFAULTS, NO_INTL, ROUND, UI, toRule, withSelector } from './eslint/bans.js';
import noNumericDefault from './eslint/no-numeric-default.js';

// ESLint does NOT merge `no-restricted-syntax` across blocks: the last matching block replaces earlier ones.
// So each file group below gets ONE complete list, and later blocks are supersets or deliberate exceptions.
const FIX = 'app/tests/fixtures/lint/**'; // seeded violations; only app/tests/unit/lint-guards.test.ts lints them
const APP_TS = ['app/src/**/*.{ts,tsx}', `${FIX}/dose/**/*.{ts,tsx}`];
const APP_TSX = ['app/src/**/*.tsx', `${FIX}/ui/**/*.tsx`];
const RULES_CORE = ['packages/rules-core/src/**/*.ts', `${FIX}/rules-core/**/*.ts`];
const FORMAT_FILE = ['app/src/i18n/format.ts']; // the ONLY file allowed to touch number formatting (R05), with its own tests

// D05 (type-aware) runs wherever a DEFAULTS ban is listed; the others are syntax selectors.
const syntax = (bans) => ({
  rules: {
    'no-restricted-syntax': ['error', ...withSelector(bans).map(toRule)],
    ...(bans.some((b) => b.id === 'D05') ? { 'aloni/no-numeric-default': 'error' } : {}),
  },
});
const typed = {
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
  },
  plugins: { '@typescript-eslint': tseslint.plugin, aloni: { rules: { 'no-numeric-default': noNumericDefault } } },
};

export default [
  { ignores: ['**/dist/**', '**/dev-dist/**', '**/node_modules/**', '**/test-results/**', 'reference/**', 'app/tests/fixtures/**', 'eslint.config.js', 'eslint/**'] },
  { files: ['app/**/*.{ts,tsx}', 'packages/**/*.ts'], ...typed, rules: { '@typescript-eslint/no-floating-promises': 'error' } },
  { files: APP_TS, ...typed, ...syntax([...ROUND, ...DEFAULTS]) },
  { files: APP_TSX, ...typed, ...syntax([...ROUND, ...DEFAULTS, ...UI]) },
  { files: RULES_CORE, ...typed, ...syntax([...ROUND, ...DEFAULTS, ...CLOCK]) },
  { files: FORMAT_FILE, ...typed, ...syntax([...ROUND.filter(NO_INTL), ...DEFAULTS]) },
];
