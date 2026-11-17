// Every safety ban, with an id. eslint.config.js builds the rules from this list and
// app/tests/unit/lint-guards.test.ts requires EVERY id to be proven red by a fixture
// (app/tests/fixtures/lint/**). A ban without a fixture cannot be merged (CODING_STANDARDS.md).
//
// Honest limit: these are syntax patterns, not a type system. They stop the known escape routes
// (see the red-team fixtures); they cannot stop a determined author. Review still matters.

const NUM = '/^[-+]?[0-9.]/'; // raw text of a numeric literal (0.5, -1, 7, 0x10, 1e3, 0n)
const MATH_FN = '/^(round|floor|ceil|trunc|fround)$/';
const LOGICAL = "/^(\\?\\?|\\|\\|)$/";
const ASSIGN_LOGICAL = "/^(\\?\\?=|\\|\\|=)$/";
const CONST_NAME = '/^[A-Z][A-Z0-9_]*$/';
const DEFAULT_NAME = '/^(default|fallback)/i';
const UF_ATTR = '/^(aria-label|aria-description|aria-placeholder|aria-roledescription|aria-valuetext|title|placeholder|alt|label)$/';
const TEXT = '/\\S/';

const ban = (id, message, ...selectors) => ({ id, message, selector: selectors.join(', ') });

// Places where a "default value" can hide: the right-hand side of ?? / ||, assignment defaults, ??= / ||=.
const defaultRight = (parent) => [
  `${parent} > Literal.right[raw=${NUM}]`,
  `${parent} > UnaryExpression.right`,
  `${parent} > Identifier.right[name=${CONST_NAME}]`,
  `${parent} > Identifier.right[name=${DEFAULT_NAME}]`,
  `${parent} > Identifier.right[name=/^(Infinity|NaN)$/]`,
  `${parent} > MemberExpression.right[object.name=${CONST_NAME}]`,
  `${parent} > MemberExpression.right[property.name=${CONST_NAME}]`,
  `${parent} > MemberExpression.right[property.name=${DEFAULT_NAME}]`,
  `${parent} > CallExpression.right[callee.name=/^(Number|parseFloat|BigInt)$/]`,
];

// `x == null ? 0 : x` and friends: a numeric literal in a ternary whose test is a null/undefined check.
const nullTernary = () => {
  const out = [];
  for (const side of ['left', 'right']) {
    for (const nul of ["[test.%s.raw='null']", "[test.%s.name='undefined']"]) {
      for (const branch of ['consequent', 'alternate']) {
        const t = nul.replace('%s', side);
        out.push(`ConditionalExpression[test.type='BinaryExpression']${t} > Literal.${branch}[raw=${NUM}]`);
        out.push(`ConditionalExpression[test.type='BinaryExpression']${t} > UnaryExpression.${branch}`);
      }
    }
  }
  return out;
};

export const ROUND = [
  ban('R01', 'No rounding in dose/label/spray code (QA P0-1): Math.round/floor/ceil/trunc/fround. Keep values exactly as stored.',
    `MemberExpression[object.name='Math'][property.name=${MATH_FN}]`,
    `MemberExpression[object.name='Math'][computed=true]`,
    `MemberExpression[object.property.name='Math'][property.name=${MATH_FN}]`,
    `MemberExpression[object.property.name='Math'][computed=true]`),
  ban('R02', 'Do not alias, destructure or pass around `Math` (it hides Math.round).',
    `Identifier[name='Math']:not(MemberExpression > Identifier.object)`),
  ban('R03', 'toFixed/toPrecision/toExponential round. Use formatDose()/formatQty() from i18n/format.ts.',
    `MemberExpression[property.name=/^(toFixed|toPrecision|toExponential)$/]`,
    `MemberExpression[computed=true][property.value=/^(toFixed|toPrecision|toExponential|toLocaleString)$/]`),
  ban('R04', 'toLocaleString rounds to 3 digits by default. Use formatDose()/formatQty() from i18n/format.ts.',
    `MemberExpression[property.name='toLocaleString']`),
  ban('R05', 'Intl.NumberFormat rounds. Only i18n/format.ts may use number formatting, with its own tests.',
    `MemberExpression[object.name='Intl'][property.name='NumberFormat']`,
    `MemberExpression[object.name='Intl'][computed=true]`,
    `Identifier[name='Intl']:not(MemberExpression > Identifier.object)`,
    `Identifier[name='NumberFormat']`),
  ban('R06', 'Truncating arithmetic (x | 0, x >> 0, ~~x, x % 1, parseInt) drops digits. Do not use it on values.',
    `BinaryExpression[operator=/^(\\||>>|>>>|<<|\\^)$/][right.type='Literal'][right.value<1]`,
    `BinaryExpression[operator=/^(\\||>>|>>>|<<|\\^)$/][left.type='Literal'][left.value<1]`,
    `AssignmentExpression[operator=/^(\\|=|>>=|>>>=|<<=|\\^=)$/][right.type='Literal'][right.value<1]`,
    `UnaryExpression[operator='~'] > UnaryExpression[operator='~']`,
    `BinaryExpression[operator='%'][right.value=1]`,
    `CallExpression[callee.name='parseInt']`,
    `MemberExpression[property.name='parseInt']`),
  ban('R07', 'No dynamic code (eval / Function): it could hide any of the other bans.',
    `CallExpression[callee.name=/^(eval|Function)$/]`,
    `NewExpression[callee.name='Function']`,
    `MemberExpression[object.name=/^(globalThis|window|self)$/][computed=true]`,
    `MemberExpression[computed=true][property.value=/^(Math|Intl|Date|eval|Function)$/]`,
    `:matches(TSAsExpression, TSTypeAssertion, TSNonNullExpression) > Identifier[name=/^(globalThis|window|self)$/]`),
];

export const DEFAULTS = [
  ban('D01', 'No numeric default for a missing value (CLAUDE.md rule 1): `?? 0`, `|| 7`, `?? -1`, `?? DEFAULT`. Missing = unknown = blocked.',
    ...defaultRight(`LogicalExpression[operator=${LOGICAL}]`)),
  ban('D02', 'No numeric default in a destructuring/parameter (`{ phi = 7 }`, `dose = 0.5`). Missing = unknown = blocked.',
    ...defaultRight('AssignmentPattern')),
  ban('D03', 'No `??=` / `||=` with a numeric default. Missing = unknown = blocked.',
    ...defaultRight(`AssignmentExpression[operator=${ASSIGN_LOGICAL}]`)),
  ban('D04', 'No numeric default via a null/undefined ternary (`x == null ? 0 : x`). Missing = unknown = blocked.',
    ...nullTernary()),
];

export const CLOCK = [
  ban('K01', 'rules-core is pure: no clock. Take `as_of` as an argument (Date.now / Date() / new Date() / bare Date).',
    `MemberExpression[object.name='Date'][property.name='now']`,
    `MemberExpression[object.name='Date'][computed=true]`,
    `MemberExpression[object.property.name='Date'][property.name='now']`,
    `NewExpression[callee.name='Date'][arguments.length=0]`,
    `NewExpression[callee.property.name='Date'][arguments.length=0]`,
    `NewExpression[callee.name='Date'] > SpreadElement`,
    `NewExpression[callee.name='Date'] > Identifier.arguments[name='undefined']`,
    `NewExpression[callee.name='Date'] > :matches(TSAsExpression, TSTypeAssertion, TSNonNullExpression, ConditionalExpression, LogicalExpression, UnaryExpression[operator='void']).arguments`,
    `CallExpression[callee.property.name='Date']`,
    `Identifier[name='Date']:not(NewExpression > Identifier.callee):not(MemberExpression > Identifier.object)`),
  ban('K02', 'rules-core is pure: no timers, performance clock, process clock or Temporal.Now.',
    `Identifier[name=/^(performance|setTimeout|setInterval|requestAnimationFrame|requestIdleCallback)$/]`,
    `MemberExpression[object.name='process']`,
    `MemberExpression[object.name='Temporal'][property.name='Now']`),
  ban('K03', 'rules-core is deterministic: no randomness (Math.random, crypto, randomUUID, getRandomValues).',
    `MemberExpression[object.name='Math'][property.name='random']`,
    `Identifier[name='crypto']`,
    `MemberExpression[property.name=/^(randomUUID|getRandomValues|randomBytes|randomInt|randomFillSync)$/]`,
    `ImportSpecifier[imported.name=/^(randomUUID|getRandomValues|randomBytes|randomInt|randomFillSync)$/]`,
    `ImportDeclaration[source.value=/^(node:)?crypto$/]`),
];

const childContainer = ':matches(JSXElement, JSXFragment) > JSXExpressionContainer';
const attrContainer = `JSXAttribute[name.name=${UF_ATTR}] > JSXExpressionContainer`;
const textOf = (container) => [
  `${container} > Literal[value=${TEXT}]`,
  `${container} > TemplateLiteral > TemplateElement[value.raw=${TEXT}]`,
  `${container} > ConditionalExpression > Literal[value=${TEXT}]`,
  `${container} > ConditionalExpression > TemplateLiteral > TemplateElement[value.raw=${TEXT}]`,
  `${container} > ConditionalExpression > ConditionalExpression > Literal[value=${TEXT}]`,
  `${container} > LogicalExpression > Literal[value=${TEXT}]`,
  `${container} > LogicalExpression > TemplateLiteral > TemplateElement[value.raw=${TEXT}]`,
  `${container} > LogicalExpression > ConditionalExpression > Literal[value=${TEXT}]`,
  `${container} BinaryExpression[operator='+'] > Literal[value=${TEXT}]`,
  `${container} BinaryExpression[operator='+'] > TemplateLiteral > TemplateElement[value.raw=${TEXT}]`,
  `${container} CallExpression[callee.property.name=/^(concat|join|padStart|padEnd|repeat)$/] > Literal[value=${TEXT}]`,
];

export const UI = [
  ban('U01', 'User-facing text must go through t() (el/tr/en): no JSX text.',
    `JSXText[value=${TEXT}]`),
  ban('U02', 'User-facing text must go through t(): no string/template literals, ternaries, `+` or concat of text inside JSX children.',
    ...textOf(childContainer)),
  ban('U03', 'User-facing attributes (aria-label, aria-description, title, placeholder, alt, label) must use t().',
    `JSXAttribute[name.name=${UF_ATTR}] > Literal[value=${TEXT}]`,
    ...textOf(attrContainer)),
  ban('U04', 'No raw HTML/text injection or hand-written element calls (they bypass t()): dangerouslySetInnerHTML, innerHTML, textContent, h(), createElement(), jsx().',
    `JSXAttribute[name.name=/^(dangerouslySetInnerHTML|children)$/]`,
    `AssignmentExpression[left.property.name=/^(innerHTML|outerHTML|textContent|innerText)$/]`,
    `CallExpression[callee.property.name=/^(insertAdjacentHTML|insertAdjacentText|createTextNode)$/]`,
    `CallExpression[callee.name=/^(h|createElement|jsx|jsxs|jsxDEV|html)$/]`,
    `CallExpression[callee.property.name=/^(createElement|h)$/]`),
  ban('U05', 'No dialogs (alert/confirm/prompt): save at once and offer a 5 s undo (UX bar).',
    `CallExpression[callee.name=/^(alert|confirm|prompt)$/]`,
    `CallExpression[callee.object.name=/^(window|globalThis|self)$/][callee.property.name=/^(alert|confirm|prompt)$/]`),
];

export const ALL_BANS = [...ROUND, ...DEFAULTS, ...CLOCK, ...UI];

export const toRule = (b) => ({ selector: b.selector, message: `[${b.id}] ${b.message}` });
export const NO_INTL = (b) => b.id !== 'R05';
