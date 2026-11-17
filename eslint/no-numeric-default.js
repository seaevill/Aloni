// D05: no numeric default for a missing value (CLAUDE.md safety rule 1: missing label data = unknown = blocked).
// Decided by TYPE, not by the shape of the right-hand side, so `x ?? seven`, `x ?? helper()`, `x ?? (0 as number)`,
// `{ dose = cfg.phi }`, `x ? x : 0`, `if (x == null) x = 0`, `{ ...DEFAULTS, ...o }`, `p.catch(() => 0)`, `Number(emptyString)` are caught.
// Needs typed linting (projectService). Known limits are listed in CODING_STANDARDS.md.
import { ESLintUtils } from '@typescript-eslint/utils';
import ts from 'typescript';

const NUMERIC = ts.TypeFlags.NumberLike | ts.TypeFlags.BigIntLike;
const ANYISH = ts.TypeFlags.Any | ts.TypeFlags.Unknown;
const MISSING_OR_TEXT = ts.TypeFlags.Null | ts.TypeFlags.Undefined | ts.TypeFlags.StringLike;
const GUARD_FN = /^(Number\.isFinite|Number\.isNaN|Number\.isInteger|isFinite|isNaN)$/;
const NUMERIC_TEXT = /^\s*[-+]?\d+(\.\d+)?\s*$/;
const WRAPPERS = new Set(['TSAsExpression', 'TSSatisfiesExpression', 'TSNonNullExpression', 'TSTypeAssertion', 'ChainExpression']);
const MSG = '[D05] No numeric default for a missing value (CLAUDE.md rule 1). Missing = unknown = blocked. Checked by type, so helper calls, casts, constants, generics and wrappers count too.';
const MSG_COERCE = '[D05] Number(x) / +x turns an empty string or null into 0, a silent dose of 0. Parse with parseDecimal() (returns "unknown") instead.';

export default {
  meta: { type: 'problem', schema: [], messages: { d05: MSG, coerce: MSG_COERCE } },
  create(context) {
    const services = ESLintUtils.getParserServices(context);
    const checker = services.program.getTypeChecker();
    const code = context.sourceCode;
    const typeOf = (n) => checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(n));
    const isNum = (t) => {
      if (t.isUnion()) return t.types.some(isNum);
      if (t.isIntersection()) return t.types.some(isNum);
      if (t.flags & ts.TypeFlags.TypeParameter) { const c = checker.getBaseConstraintOfType(t); return c && c !== t ? isNum(c) : false; }
      return (t.flags & NUMERIC) !== 0;
    };
    const isGeneric = (t) => (t.isUnion() ? t.types.some(isGeneric) : (t.flags & ts.TypeFlags.TypeParameter) !== 0);
    const unwrap = (n) => { let x = n; while (WRAPPERS.has(x.type)) x = x.expression ?? x.argument; return x; };
    const numericText = (n) => { const u = unwrap(n); return u.type === 'Literal' && typeof u.value === 'string' && NUMERIC_TEXT.test(u.value); };
    const numeric = (n) => isNum(typeOf(n)) || isNum(typeOf(unwrap(n))) || numericText(n);
    const norm = (s) => s.replace(/\?\./g, '.').replace(/[\s()!]/g, '');
    const text = (n) => (n.synthetic ?? code.getText(n));
    const mentions = (branch, subject) => norm(text(branch)).includes(norm(text(subject)));
    const report = (node, messageId = 'd05') => context.report({ node, messageId });

    const isNullish = (n) => (n.type === 'Literal' && (n.raw === 'null' || n.value === 'undefined')) || (n.type === 'Identifier' && n.name === 'undefined') || (n.type === 'UnaryExpression' && n.operator === 'void');
    /** the expression a test checks for "missing / not there", or null */
    const subjectOf = (test) => {
      if (test.type === 'Identifier' || test.type === 'MemberExpression') return test;
      if (test.type === 'ChainExpression') return subjectOf(test.expression);
      if (test.type === 'UnaryExpression' && test.operator === '!') return subjectOf(test.argument);
      if (test.type === 'LogicalExpression') return subjectOf(test.left) ?? subjectOf(test.right);
      if (test.type === 'CallExpression') {
        const callee = code.getText(test.callee);
        if (GUARD_FN.test(callee) && test.arguments[0]) return test.arguments[0];
        if (test.callee.type === 'MemberExpression' && test.callee.property.name === 'has') return test.callee.object;
        if (callee === 'Object.hasOwn' && test.arguments[0]) return test.arguments[0];
      }
      if (test.type === 'BinaryExpression' && test.operator === 'in') {
        return test.left.type === 'Literal' ? { synthetic: `${code.getText(test.right)}.${test.left.value}` } : test.right;
      }
      if (test.type === 'BinaryExpression' && /^[!=]==?$/.test(test.operator)) {
        const t = [test.left, test.right].find((x) => x.type === 'UnaryExpression' && x.operator === 'typeof');
        if (t) return t.argument;
        if (isNullish(test.right)) return test.left;
        if (isNullish(test.left)) return test.right;
      }
      return null;
    };
    const returnsNumber = (stmts) => stmts.some((st) => st.type === 'ReturnStatement' && st.argument && numeric(st.argument));
    const assignsNumber = (st, s) => st.type === 'ExpressionStatement' && st.expression.type === 'AssignmentExpression' && st.expression.operator === '=' && (!s || mentions(st.expression.left, s)) && numeric(st.expression.right);

    const fallback = (node, left, right) => {
      const l = typeOf(left);
      if ((isNum(l) || isGeneric(l) || (l.flags & ANYISH)) && numeric(right)) report(node);
    };
    const objectsWithNumbers = (n) => {
      // an object whose TYPE has numeric properties (e.g. a DEFAULTS constant)
      const t = typeOf(n);
      return checker.getPropertiesOfType(t).some((p) => isNum(checker.getTypeOfSymbolAtLocation(p, services.esTreeNodeToTSNodeMap.get(n))));
    };
    const numericProps = (o) => o.properties.filter((p) => p.type === 'Property' && numeric(p.value));

    return {
      LogicalExpression(n) {
        if (n.operator === '??' || n.operator === '||') fallback(n, n.left, n.right);
        else if (n.operator === '&&') { // `v === undefined && (v = 0)`
          const s = subjectOf(n.left);
          const r = unwrap(n.right);
          if (s && r.type === 'AssignmentExpression' && r.operator === '=' && mentions(r.left, s) && numeric(r.right)) report(n);
        }
      },
      AssignmentExpression(n) { if (n.operator === '??=' || n.operator === '||=') fallback(n, n.left, n.right); },
      AssignmentPattern(n) { if (numeric(n.right)) report(n); },
      ConditionalExpression(n) {
        const s = subjectOf(n.test);
        if (!s) return;
        if (mentions(n.consequent, s) && !mentions(n.alternate, s) && numeric(n.alternate)) report(n);
        else if (mentions(n.alternate, s) && !mentions(n.consequent, s) && numeric(n.consequent)) report(n);
      },
      IfStatement(n) {
        const s = subjectOf(n.test);
        if (!s) return;
        const body = n.consequent.type === 'BlockStatement' ? n.consequent.body : [n.consequent];
        for (const st of body) {
          if (st.type === 'ReturnStatement' && st.argument && numeric(st.argument)) report(st);
          if (assignsNumber(st, s)) report(st);
          // `Object.assign(q, { dose: 0 })`, `Reflect.set(q, 'dose', 0)`
          if (st.type === 'ExpressionStatement' && st.expression.type === 'CallExpression' && /^(Object\.assign|Reflect\.set)$/.test(code.getText(st.expression.callee))
            && st.expression.arguments.some((a) => numeric(a) || (a.type === 'ObjectExpression' && numericProps(a).length))) report(st);
        }
      },
      SwitchCase(n) { if (n.test && isNullish(n.test) && returnsNumber(n.consequent)) report(n); },
      CatchClause(n) { if (returnsNumber(n.body.body) || n.body.body.some((st) => assignsNumber(st))) report(n); },
      CallExpression(n) {
        const callee = code.getText(n.callee);
        // `p.catch(() => 0)` and `p.then(ok, () => 0)`
        if (n.callee.type === 'MemberExpression' && /^(catch|then)$/.test(n.callee.property.name)) {
          const fn = n.callee.property.name === 'catch' ? n.arguments[0] : n.arguments[1];
          if (fn && /Function/.test(fn.type) && (fn.body.type === 'BlockStatement' ? returnsNumber(fn.body.body) : numeric(fn.body))) report(n);
        }
        // parseFloat(s ?? '7'), Number(s || '0'): a text default that becomes a number
        if (/^(Number|parseFloat|Number\.parseFloat)$/.test(callee) && n.arguments[0]) {
          const a = unwrap(n.arguments[0]);
          if (a.type === 'LogicalExpression' && /^(\?\?|\|\|)$/.test(a.operator) && numericText(a.right)) report(n);
        }
        // Number(x) of a nullable/text value is a silent 0
        if (callee === 'Number' && n.arguments.length === 1 && n.arguments[0].type !== 'Literal' && typeOf(n.arguments[0]).flags & MISSING_OR_TEXT) report(n, 'coerce');
        else if (callee === 'Number' && n.arguments.length === 1 && n.arguments[0].type !== 'Literal' && typeOf(n.arguments[0]).isUnion() && typeOf(n.arguments[0]).types.some((t) => t.flags & MISSING_OR_TEXT)) report(n, 'coerce');
        // Object.assign({}, DEFAULTS, o): a defaults object that is not the last argument
        if (callee === 'Object.assign' && n.arguments.length > 1) {
          n.arguments.slice(0, -1).forEach((a) => { if ((a.type === 'ObjectExpression' && numericProps(a).length) || (a.type !== 'ObjectExpression' && objectsWithNumbers(a))) report(a); });
        }
      },
      UnaryExpression(n) {
        if (n.operator === '+' && n.argument.type !== 'Literal') {
          const t = typeOf(n.argument);
          if ((t.flags & MISSING_OR_TEXT) || (t.isUnion() && t.types.some((x) => x.flags & MISSING_OR_TEXT))) report(n, 'coerce');
        }
      },
      ObjectExpression(n) {
        const spreads = n.properties.map((p, i) => (p.type === 'SpreadElement' ? i : -1)).filter((i) => i >= 0);
        if (!spreads.length) return;
        const last = spreads[spreads.length - 1];
        // `{ phi: 7, ...o }`: numeric property BEFORE a spread is a default; after the last spread it is an override
        n.properties.forEach((p, i) => { if (i < last && p.type === 'Property' && numeric(p.value)) report(p); });
        // `{ ...DEFAULTS, ...o }`: an earlier spread whose type carries numbers
        spreads.slice(0, -1).forEach((i) => { const a = n.properties[i].argument; if (a.type === 'ObjectExpression' ? numericProps(a).length : objectsWithNumbers(a)) report(n.properties[i]); });
      },
    };
  },
};
