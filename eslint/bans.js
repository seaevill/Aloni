// Every safety ban, with an id. eslint.config.js builds the rules from this list and
// app/tests/unit/lint-guards.test.ts requires EVERY id to be proven red by a fixture
// (app/tests/fixtures/lint/**). A ban without a fixture cannot be merged (CODING_STANDARDS.md).
//
// Honest limit: these are syntax patterns, not a type system. They stop the known escape routes
// (see the red-team fixtures); they cannot stop a determined author. Review still matters.

const MATH_FN = '/^(round|floor|ceil|trunc|fround|imul)$/';
const UF_ATTR = '/^(aria-label|aria-description|aria-placeholder|aria-roledescription|aria-valuetext|ariaLabel|ariaDescription|title|placeholder|alt|label)$/';
const TEXT = '/\\S/';

const ban = (id, message, ...selectors) => ({ id, message, selector: selectors.join(', ') });

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
  ban('R06', 'Truncating arithmetic (x | 0, ~~x, x % 1 or x % 0.5, parseInt, typed arrays, slicing digits) drops digits. Do not use it on values.',
    `BinaryExpression[operator=/^(\\||>>|>>>|<<|\\^)$/][right.type='Literal'][right.value<1]`,
    `BinaryExpression[operator=/^(\\||>>|>>>|<<|\\^)$/][left.type='Literal'][left.value<1]`,
    `AssignmentExpression[operator=/^(\\|=|>>=|>>>=|<<=|\\^=)$/][right.type='Literal'][right.value<1]`,
    `UnaryExpression[operator='~'] > UnaryExpression[operator='~']`,
    `BinaryExpression[operator=/^(\\||>>|>>>|<<|\\^)$/]:matches([right.type=/^(UnaryExpression|TSAsExpression|TSSatisfiesExpression|BinaryExpression)$/], [left.type=/^(UnaryExpression|TSAsExpression|TSSatisfiesExpression)$/])`,
    `UnaryExpression[operator='~'] UnaryExpression[operator='~']`,
    `BinaryExpression[operator='%']:not([right.raw=/^([2-9]|[1-9][0-9]+)$/])`,
    `CallExpression[callee.name=/^(Number|parseFloat)$/] CallExpression[callee.property.name=/^(split|slice|substring|substr)$/]`,
    `NewExpression[callee.name=/^(Int|Uint|Float|BigInt|BigUint)(8|16|32|64)(Clamped)?Array$/]`,
    `MemberExpression[object.name='BigInt'][property.name=/^as(Int|Uint)N$/]`,
    `CallExpression[callee.name='parseInt']`,
    `MemberExpression[property.name='parseInt']`),
  ban('R07', 'No dynamic code (eval / Function): it could hide any of the other bans.',
    `CallExpression[callee.name=/^(eval|Function)$/]`,
    `NewExpression[callee.name='Function']`,
    `MemberExpression[object.name=/^(globalThis|window|self)$/][computed=true]`,
    `MemberExpression[computed=true][property.value=/^(Math|Intl|Date|eval|Function)$/]`,
    `:matches(TSAsExpression, TSTypeAssertion, TSNonNullExpression) > Identifier[name=/^(globalThis|window|self)$/]`),
];

// D05 is a custom TYPE-AWARE rule (eslint/no-numeric-default.js), registered in eslint.config.js; it has no selector.
export const DEFAULTS = [{ id: 'D05', message: 'No numeric default for a missing value (type-aware, see no-numeric-default.js).', selector: '' }];

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
    `Identifier[name='Date']:not(NewExpression > Identifier.callee):not(MemberExpression > Identifier.object):not(TSTypeReference > Identifier.typeName)`,
    `MemberExpression[property.name='prototype'][object.name='Date']`,
    `MemberExpression[object.property.name='prototype'][property.name='constructor']`,
    `MemberExpression[object.property.name='constructor'][property.name='constructor']`,
    `CallExpression[callee.property.name='format'][arguments.length=0]`,
    `CallExpression[callee.property.name='format'] > Identifier.arguments[name='undefined']`),
  ban('K02', 'rules-core is pure: no timers, performance clock, process clock or Temporal.Now.',
    `Identifier[name=/^(performance|setTimeout|setInterval|setImmediate|queueMicrotask|requestAnimationFrame|requestIdleCallback|process|Atomics|globalThis|window|self|global)$/]:not(Property > Identifier.key):not(MemberExpression > Identifier.property)`,
    `MemberExpression[property.name=/^(performance|process|Temporal)$/]`,
    `MemberExpression[object.name='Temporal'][property.name='Now']`),
  ban('K03', 'rules-core is deterministic: no randomness (Math.random, crypto, randomUUID, getRandomValues).',
    `MemberExpression[object.name='Math'][property.name='random']`,
    `Identifier[name='crypto']`,
    `MemberExpression[property.name='crypto']`,
    `MemberExpression[property.name=/^(randomUUID|getRandomValues|randomBytes|randomInt|randomFillSync)$/]`,
    `ImportSpecifier[imported.name=/^(randomUUID|getRandomValues|randomBytes|randomInt|randomFillSync)$/]`,
    `ImportDeclaration[source.value=/^(node:)?crypto$/]`,
    `ImportExpression[source.value=/crypto/]`,
    `CallExpression[callee.name='require'][arguments.0.value=/crypto/]`),
];

const child = ':matches(JSXElement, JSXFragment) > JSXExpressionContainer';
// A text literal whose parent is one of these is "a value that ends up on screen" (not a comparison, a call argument or a key).
const SHOWN = '/^(JSXExpressionContainer|ConditionalExpression|LogicalExpression|ArrowFunctionExpression|ArrayExpression|SequenceExpression|TSAsExpression|TSNonNullExpression|TSSatisfiesExpression|TSTypeAssertion|ReturnStatement|SpreadElement)$/';
const NOT_IN_ATTR = ':not(JSXAttribute *)'; // class/key/aria-current inside nested elements are not text

export const UI = [
  ban('U01', 'User-facing text must go through t() (el/tr/en): no JSX text.',
    `JSXText[value=${TEXT}]`),
  ban('U02', 'User-facing text must go through t(): no string/template literals, ternaries, `+`, arrays, casts or tagged templates inside JSX children.',
    `${child} Literal[value=${TEXT}][parent.type=${SHOWN}]${NOT_IN_ATTR}`,
    `${child} BinaryExpression[operator='+'] > Literal[value=${TEXT}]${NOT_IN_ATTR}`,
    `${child} TemplateElement[value.raw=${TEXT}]${NOT_IN_ATTR}`,
    `${child} TaggedTemplateExpression`,
    `${child} CallExpression[callee.property.name=/^(concat|join|padStart|padEnd|repeat|replace|replaceAll)$/] > Literal.arguments[value=${TEXT}]${NOT_IN_ATTR}`),
  ban('U03', 'User-facing attributes (aria-label, aria-description, title, placeholder, alt, label) must use t(): no literals, templates, variables or spread objects.',
    `JSXAttribute[name.name=${UF_ATTR}] > Literal[value=${TEXT}]`,
    `JSXAttribute[name.name=${UF_ATTR}] Literal[value=${TEXT}][parent.type=${SHOWN}]`,
    `JSXAttribute[name.name=${UF_ATTR}] BinaryExpression[operator='+'] > Literal[value=${TEXT}]`,
    `JSXAttribute[name.name=${UF_ATTR}] TemplateElement[value.raw=${TEXT}]`,
    `JSXAttribute[name.name=${UF_ATTR}] MemberExpression > Literal.object[value=${TEXT}]`,
    `JSXAttribute[name.name=${UF_ATTR}] CallExpression[callee.property.name=/^(concat|join|padStart|padEnd|repeat|replace|replaceAll)$/] > Literal.arguments[value=${TEXT}]`,
    `JSXAttribute[name.name=${UF_ATTR}] > JSXExpressionContainer > :matches(Identifier, MemberExpression)`,
    `JSXSpreadAttribute ObjectExpression > Property[key.name=${UF_ATTR}]`,
    `JSXSpreadAttribute ObjectExpression > Property[key.value=${UF_ATTR}]`),
  ban('U04', 'No raw HTML/text injection or hand-written element calls (they bypass t()): dangerouslySetInnerHTML, innerHTML, textContent, placeholder/title assignments, append/setAttribute, h(), createElement(), jsx().',
    `JSXAttribute[name.name=/^(dangerouslySetInnerHTML|children)$/]`,
    `AssignmentExpression[left.property.name=/^(innerHTML|outerHTML|textContent|innerText|placeholder|title|alt|nodeValue|data)$/]`,
    `AssignmentExpression[left.computed=true][left.property.value=/^(innerHTML|outerHTML|textContent|innerText|placeholder|title|alt|nodeValue|data)$/]`,
    `CallExpression[callee.property.name=/^(insertAdjacentHTML|insertAdjacentText|createTextNode|append|prepend|replaceChildren|setAttribute|write|writeln|after|before)$/]`,
    `CallExpression[callee.name=/^(h|createElement|jsx|jsxs|jsxDEV|html)$/]`,
    `CallExpression[callee.property.name=/^(createElement|h)$/]`),
  ban('U05', 'No dialogs (alert/confirm/prompt), not even through an alias: save at once and offer a 5 s undo (UX bar).',
    `Identifier[name=/^(alert|confirm|prompt)$/]:not(Property > Identifier.key):not(MemberExpression > Identifier.property)`,
    `MemberExpression[property.name=/^(alert|confirm|prompt)$/]`,
    `ObjectPattern > Property[key.name=/^(alert|confirm|prompt)$/]`),
];

export const ALL_BANS = [...ROUND, ...DEFAULTS, ...CLOCK, ...UI];

export const toRule = (b) => ({ selector: b.selector, message: `[${b.id}] ${b.message}` });
export const withSelector = (bans) => bans.filter((b) => b.selector);
export const NO_INTL = (b) => b.id !== 'R05';
