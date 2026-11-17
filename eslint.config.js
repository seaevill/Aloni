// Safety rules from CLAUDE.md, enforced mechanically (see CODING_STANDARDS.md).
import tseslint from 'typescript-eslint';

// Zones. The "fixtures/lint" entries exist only so tests/unit/lint-guards.test.ts can prove each ban is red.
const DOSE_ZONE = [
  'app/src/label/**', 'app/src/dose/**', 'app/src/spray/**',
  'packages/rules-core/src/**', 'app/tests/fixtures/lint/dose/**',
];
const RULES_CORE = ['packages/rules-core/src/**', 'app/tests/fixtures/lint/rules-core/**'];
const UI_ZONE = ['app/src/ui/**/*.tsx', 'app/tests/fixtures/lint/ui/**/*.tsx'];

const noRounding = [
  {
    selector: "CallExpression[callee.object.name='Math'][callee.property.name=/^(round|floor|ceil|trunc)$/]",
    message: 'No rounding in label/dose/spray code or rules-core (QA P0-1). Keep values exactly as stored.',
  },
  {
    selector: "CallExpression[callee.property.name='toFixed']",
    message: 'toFixed rounds. Use formatDose() so doses print exactly as stored.',
  },
  {
    selector: "LogicalExpression[operator=/^(\\?\\?|\\|\\|)$/][right.raw=/^[-+]?[0-9.]/]",
    message: 'No numeric default for a missing value (CLAUDE.md rule 1). Missing = unknown = blocked.',
  },
];
const noClock = [
  { selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']", message: 'rules-core is pure: no clock. Take `as_of` as an argument.' },
  { selector: "NewExpression[callee.name='Date'][arguments.length=0]", message: 'rules-core is pure: no clock. Take `as_of` as an argument.' },
  { selector: "CallExpression[callee.object.name='performance'][callee.property.name='now']", message: 'rules-core is pure: no clock.' },
  { selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']", message: 'rules-core is deterministic: no randomness.' },
];
const noUiLiterals = [
  { selector: 'JSXText[value=/\\S/]', message: 'User-facing text must go through t() (el/tr/en).' },
  { selector: 'JSXElement > JSXExpressionContainer > Literal[value=/\\S/]', message: 'User-facing text must go through t().' },
  { selector: 'JSXElement > JSXExpressionContainer > ConditionalExpression > Literal[value=/\\S/]', message: 'User-facing text must go through t().' },
  { selector: 'JSXElement > JSXExpressionContainer > LogicalExpression > Literal[value=/\\S/]', message: 'User-facing text must go through t().' },
  { selector: "JSXAttribute[name.name=/^(title|aria-label|placeholder|alt)$/] > Literal", message: 'User-facing attribute text must go through t().' },
];

const typed = {
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
  },
  plugins: { '@typescript-eslint': tseslint.plugin },
};

export default [
  { ignores: ['**/dist/**', '**/dev-dist/**', '**/node_modules/**', '**/test-results/**', 'reference/**', 'app/tests/fixtures/**', 'eslint.config.js'] },
  { files: ['app/**/*.{ts,tsx}', 'packages/**/*.ts'], ...typed, rules: { '@typescript-eslint/no-floating-promises': 'error' } },
  { files: DOSE_ZONE, ...typed, rules: { 'no-restricted-syntax': ['error', ...noRounding] } },
  { files: RULES_CORE, ...typed, rules: { 'no-restricted-syntax': ['error', ...noRounding, ...noClock] } },
  { files: UI_ZONE, ...typed, rules: { 'no-restricted-syntax': ['error', ...noUiLiterals] } },
];
