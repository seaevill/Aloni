// Every safety ban has an id. eslint.config.js builds the rules from these lists; app/tests/unit/lint-guards.test.ts requires EVERY id
// to be proven red by a fixture in app/tests/fixtures/lint/**. These are syntax/type patterns, not a proof: see CODING_STANDARDS.md "Known limits".

const MATH_FN = '/^(round|floor|ceil|trunc|f16round|fround|imul)$/';
const BITWISE = '/^(\\||>>|>>>|<<|\\^)$/';
const INT_LITERAL = '/^([1-9][0-9]*|0x[0-9a-fA-F]+)$/';
const IN_T_CALL = ":not(CallExpression[callee.name='t'] *)"; // keys inside t(...) are checked by the I18nKey type
const UF_ATTR = '/^(aria-label|aria-description|aria-placeholder|aria-roledescription|aria-valuetext|ariaLabel|ariaDescription|title|placeholder|alt|label)$/';
const TEXT = '/\\S/';
const I18N_KEY = '/^[a-z][a-zA-Z]*(\\.[a-zA-Z0-9]+)+$/'; // 'tab.today' is a key, not visible text
const STR_FN = '/^(concat|join|padStart|padEnd|repeat|replace|replaceAll)$/';

// A selector-less entry documents a ban implemented by a custom rule or by `no-restricted-imports` (see eslint.config.js).
const ban = (id, message, ...selectors) => ({ id, message, selector: selectors.join(', ') });

export const ROUND = [
  ban('R01', 'No rounding in dose/label/spray code (QA P0-1): Math.round/floor/ceil/trunc/fround/imul. Keep values exactly as stored.',
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
  ban('R05', 'Intl number/unit formatting (NumberFormat, RelativeTimeFormat, DurationFormat) rounds. Only i18n/format.ts may format numbers, with its own tests. Allowed Intl: DateTimeFormat, Collator, PluralRules, Segmenter, ListFormat.',
    `MemberExpression[object.name='Intl']:not([property.name=/^(DateTimeFormat|Collator|PluralRules|Segmenter|ListFormat)$/])`,
    `Identifier[name='Intl']:not(MemberExpression > Identifier.object)`,
    `Identifier[name='NumberFormat']`),
  ban('R06', 'Truncating arithmetic (x | 0, ~~x, x & -1, x % 1 or x % 0.5, parseInt, typed arrays, DataView, slicing the digits of String(x)) drops digits. Do not use it on values.',
    `BinaryExpression[operator=${BITWISE}]:not([right.raw=${INT_LITERAL}])`,
    `AssignmentExpression[operator=/^(\\|=|>>=|>>>=|<<=|\\^=)$/]:not([right.raw=${INT_LITERAL}])`,
    `:matches(BinaryExpression[operator='&'], AssignmentExpression[operator='&='])[right.raw=/^(0x[fF]{8}|4294967295)$/]`,
    `:matches(BinaryExpression[operator='&'], AssignmentExpression[operator='&=']) > UnaryExpression.right[operator='-']`,
    `MemberExpression[property.name=/^(get|set)(Float|Int|Uint|BigInt|BigUint)(8|16|32|64)$/]`,
    `UnaryExpression[operator='~'] UnaryExpression[operator='~']`,
    `BinaryExpression[operator='%']:not([right.raw=/^([2-9]|[1-9][0-9]+)$/])`,
    `CallExpression[callee.name=/^(Number|parseFloat)$/] CallExpression[callee.property.name=/^(split|slice|substring|substr)$/]`,
    `CallExpression[callee.property.name=/^(slice|substring|substr|split|replace|replaceAll|match)$/]:matches([callee.object.callee.name='String'], [callee.object.callee.property.name='toString'])`,
    `CallExpression[callee.name='parseInt']`,
    `MemberExpression[property.name='parseInt']`),
  ban('R09', 'Typed arrays and DataView (Float32Array, Int32Array, ...) truncate numbers; only app/src/db/uuid.ts and sha256.ts (hashing ids and files, never doses) may use them.',
    `Identifier[name=/^((Int|Uint|Float|BigInt|BigUint)(8|16|32|64)(Clamped)?Array|DataView)$/]`,
    `MemberExpression[object.name='BigInt'][property.name=/^as(Int|Uint)N$/]`),
  ban('R07', 'No dynamic code (eval / Function): it could hide any of the other bans.',
    `CallExpression[callee.name=/^(eval|Function)$/]`,
    `NewExpression[callee.name='Function']`,
    `MemberExpression[object.name=/^(globalThis|window|self)$/][computed=true]`,
    `MemberExpression[computed=true][property.value=/^(Math|Intl|Date|eval|Function)$/]`,
    `:matches(TSAsExpression, TSTypeAssertion, TSNonNullExpression) > Identifier[name=/^(globalThis|window|self)$/]`),
  ban('R08', 'No rounding/number libraries (lodash, mathjs, big.js, decimal.js, ...) in app code.'), // no-restricted-imports in eslint.config.js
];
export const DEFAULTS = [
  ban('D05', 'No numeric default for a missing value; no silent 0 from Number()/+x (type-aware, eslint/no-numeric-default.js).'),
];
export const CLOCK = [
  ban('K01', 'rules-core is pure: no clock. Take `as_of` as an argument (Date.now / Date() / new Date() / bare Date / .constructor / format() without a date).',
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
    `MemberExpression[property.name=/^(prototype|constructor|getPrototypeOf|resolvedOptions|getTimezoneOffset)$/]`,
    `MemberExpression[object.name='Temporal'][property.name='Now']`,
    `Identifier[name='Reflect']`,
    `CallExpression[callee.property.name=/^(format|formatToParts)$/][arguments.length=0]`,
    `CallExpression[callee.property.name=/^(format|formatToParts)$/] > :matches(SpreadElement, UnaryExpression[operator='void'], Identifier[name='undefined']).arguments`),
  ban('K02', 'rules-core is pure: no timers, performance/process clocks, environment or global objects (checked by scope: a variable named `window` or `process` of your own is fine).'), // eslint/no-global.js
  ban('K03', 'rules-core is deterministic: no randomness (Math.random, crypto, randomUUID, getRandomValues).',
    `MemberExpression[object.name='Math'][property.name='random']`,
    `MemberExpression[property.name=/^(randomUUID|getRandomValues|randomBytes|randomInt|randomFillSync)$/]`,
    `ImportSpecifier[imported.name=/^(randomUUID|getRandomValues|randomBytes|randomInt|randomFillSync)$/]`,
    `ImportDeclaration[source.value=/^(node:)?crypto$/]`,
    `ImportExpression[source.value=/crypto/]`,
    `CallExpression[callee.name='require'][arguments.0.value=/crypto/]`),
  ban('K04', 'rules-core may import only relative files (no clock/random libraries such as uuid, dayjs, nanoid), no dynamic import with a computed name, no import.meta.',
    `ImportExpression > :not(Literal).source`,
    `MetaProperty`),
];
const child = ':matches(JSXElement, JSXFragment) > JSXExpressionContainer';
// A text literal whose parent is one of these is "a value that ends up on screen" (not a comparison, a call argument or a key).
const SHOWN = '/^(JSXExpressionContainer|ConditionalExpression|LogicalExpression|ArrowFunctionExpression|ArrayExpression|SequenceExpression|TSAsExpression|TSNonNullExpression|TSSatisfiesExpression|TSTypeAssertion|ReturnStatement|SpreadElement)$/';
const NOT_IN_ATTR = ':not(JSXAttribute *)'; // class/key/aria-current inside nested elements are not text
const DOM_TEXT = '/^(innerHTML|outerHTML|textContent|innerText|outerText|ariaLabel|placeholder|title|alt|nodeValue|data)$/';
export const UI = [
  ban('U01', 'User-facing text must go through t() (el/tr/en): no JSX text.',
    `JSXText[value=${TEXT}]`),
  ban('U02', 'User-facing text must go through t(): no string/template literals, ternaries, `+`, arrays, casts, join/concat or tagged templates inside JSX children.',
    `${child} Literal[value=${TEXT}][parent.type=${SHOWN}]${NOT_IN_ATTR}`,
    `${child} BinaryExpression[operator='+'] > Literal[value=${TEXT}]${NOT_IN_ATTR}`,
    `${child} TemplateElement[value.raw=${TEXT}]${NOT_IN_ATTR}${IN_T_CALL}`,
    `${child} TaggedTemplateExpression`,
    `${child} CallExpression[callee.property.name=${STR_FN}] > Literal.arguments[value=${TEXT}]:not([value=/^[0-9]+$/])${NOT_IN_ATTR}`),
  ban('U03', 'User-facing attributes (aria-label, aria-description, title, placeholder, alt, label) must use t(): no literals, templates, variables, spread objects or label/title/text properties holding visible text.',
    `JSXAttribute[name.name=${UF_ATTR}] > Literal[value=${TEXT}]`,
    `JSXAttribute[name.name=${UF_ATTR}] Literal[value=${TEXT}][parent.type=${SHOWN}]`,
    `JSXAttribute[name.name=${UF_ATTR}] BinaryExpression[operator='+'] > Literal[value=${TEXT}]`,
    `JSXAttribute[name.name=${UF_ATTR}] TemplateElement[value.raw=${TEXT}]${IN_T_CALL}`,
    `JSXAttribute[name.name=${UF_ATTR}] MemberExpression > Literal.object[value=${TEXT}]`,
    `JSXAttribute[name.name=${UF_ATTR}] CallExpression[callee.property.name=${STR_FN}] > Literal.arguments[value=${TEXT}]`,
    `JSXAttribute[name.name=${UF_ATTR}] > JSXExpressionContainer > :matches(Identifier, MemberExpression)`,
    `JSXAttribute > JSXExpressionContainer ArrowFunctionExpression > Literal.body[value=${TEXT}]`,
    `JSXSpreadAttribute ObjectExpression > Property[key.name=${UF_ATTR}]`,
    `JSXSpreadAttribute ObjectExpression > Property[key.value=${UF_ATTR}]`,
    `Property[key.name=/^(label|title|text|placeholder|alt|message|caption|heading|description)$/] > Literal.value[value=${TEXT}]:not([value=${I18N_KEY}])`),
  ban('U04', 'No raw HTML/text injection or hand-written element calls (they bypass t()): dangerouslySetInnerHTML, innerHTML, textContent, placeholder/title assignments, append/setAttribute, html``, h(), createElement(), jsx().',
    `JSXAttribute[name.name=/^(dangerouslySetInnerHTML|children)$/]`,
    `AssignmentExpression[left.property.name=${DOM_TEXT}]`,
    `AssignmentExpression[left.computed=true][left.property.value=${DOM_TEXT}]`,
    `CallExpression[callee.property.name=/^(insertAdjacentHTML|insertAdjacentText|createTextNode|createContextualFragment|setHTMLUnsafe|parseHTMLUnsafe|append|prepend|replaceChildren|replaceWith|setAttribute|write|writeln|after|before)$/]`,
    `NewExpression[callee.name=/^(Text|Option|Notification)$/]`,
    `TaggedTemplateExpression[tag.name=/^(html|svg)$/]`,
    `CallExpression[callee.name=/^(h|createElement|jsx|jsxs|jsxDEV|html)$/]`,
    `CallExpression[callee.property.name=/^(createElement|h)$/]`),
  ban('U05', 'No dialogs (alert/confirm/prompt), not even through an alias: save at once and offer a 5 s undo (UX bar).',
    `MemberExpression[property.name=/^(alert|confirm|prompt)$/]`,
    `ObjectPattern > Property[key.name=/^(alert|confirm|prompt)$/]`),
];
// W01 (eslint/no-direct-dexie-write.js): the single write path. Documentary entry; the fixture proves it red.
export const WRITES = [ban('W01', 'Dexie writes only through repo.put() (type-aware, eslint/no-direct-dexie-write.js).')];
export const ALL_BANS = [...ROUND, ...DEFAULTS, ...CLOCK, ...UI, ...WRITES];

export const toRule = (b) => ({ selector: b.selector, message: `[${b.id}] ${b.message}` });
export const withSelector = (bans) => bans.filter((b) => b.selector);
export const NO_INTL = (b) => b.id !== 'R05';
export const NO_TYPED_ARRAYS = (b) => b.id !== 'R09';
