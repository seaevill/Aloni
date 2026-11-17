// D05: no numeric default for a missing value (CLAUDE.md safety rule 1: missing label data = unknown = blocked).
// Decided by TYPE, not by the shape of the right-hand side, so `x ?? seven`, `x ?? helper()`, `x ?? (0 as number)`,
// `{ dose = cfg.phi }`, `x ? x : 0`, `if (x == null) x = 0` are all caught. Needs typed linting (projectService).
import { ESLintUtils } from '@typescript-eslint/utils';
import ts from 'typescript';

const NUMERIC = ts.TypeFlags.NumberLike | ts.TypeFlags.BigIntLike;
const ANYISH = ts.TypeFlags.Any | ts.TypeFlags.Unknown;
const LABEL_KEY = /^(phi|rei|dose|doses|max|min|interval|apps|qty|quantity|area|crate|crates|label)/i;
const GUARD_FN = /^(Number\.isFinite|Number\.isNaN|Number\.isInteger|isFinite|isNaN)$/;
const MSG = '[D05] No numeric default for a missing value (CLAUDE.md rule 1). Missing = unknown = blocked. Checked by type: helper calls, casts, lowercase constants and wrappers count too.';

export default {
  meta: { type: 'problem', schema: [], messages: { d05: MSG } },
  create(context) {
    const services = ESLintUtils.getParserServices(context);
    const checker = services.program.getTypeChecker();
    const code = context.sourceCode;
    const typeOf = (n) => checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(n));
    const isNum = (t) => (t.isUnion() ? t.types.some(isNum) : (t.flags & NUMERIC) !== 0);
    const isAnyish = (t) => (t.flags & ANYISH) !== 0;
    const numeric = (n) => isNum(typeOf(n));
    const norm = (s) => s.replace(/[\s()!]/g, '');
    const report = (node) => context.report({ node, messageId: 'd05' });

    const isNullish = (n) => (n.type === 'Literal' && n.raw === 'null') || (n.type === 'Identifier' && n.name === 'undefined') || (n.type === 'UnaryExpression' && n.operator === 'void');
    /** the expression a test is checking for "missing", or null */
    const subjectOf = (test) => {
      if (test.type === 'Identifier' || test.type === 'MemberExpression') return test;
      if (test.type === 'UnaryExpression' && test.operator === '!') return subjectOf(test.argument);
      if (test.type === 'CallExpression' && GUARD_FN.test(code.getText(test.callee)) && test.arguments[0]) return test.arguments[0];
      if (test.type === 'BinaryExpression' && test.operator === 'in' && test.left.type === 'Literal') return { synthetic: `${code.getText(test.right)}.${test.left.value}` };
      if (test.type === 'BinaryExpression' && /^[!=]==?$/.test(test.operator)) {
        if (isNullish(test.right)) return test.left;
        if (isNullish(test.left)) return test.right;
        const t = test.left.type === 'UnaryExpression' && test.left.operator === 'typeof' ? test.left : test.right.type === 'UnaryExpression' && test.right.operator === 'typeof' ? test.right : null;
        if (t) return t.argument;
      }
      return null;
    };
    const text = (n) => (n.synthetic ?? code.getText(n));
    const same = (a, b) => norm(text(a)) === norm(text(b));

    const fallback = (node, left, right) => {
      if (isNum(typeOf(left)) || (isAnyish(typeOf(left)) && numeric(right))) report(node);
    };

    return {
      LogicalExpression(n) { if (n.operator === '??' || n.operator === '||') fallback(n, n.left, n.right); },
      AssignmentExpression(n) {
        if (n.operator === '??=' || n.operator === '||=') fallback(n, n.left, n.right);
      },
      AssignmentPattern(n) { if (numeric(n.right)) report(n); },
      ConditionalExpression(n) {
        const s = subjectOf(n.test);
        if (!s) return;
        if (same(n.consequent, s) && numeric(n.alternate)) report(n);
        else if (same(n.alternate, s) && numeric(n.consequent)) report(n);
      },
      IfStatement(n) {
        const s = subjectOf(n.test);
        if (!s) return;
        const body = n.consequent.type === 'BlockStatement' ? n.consequent.body : [n.consequent];
        for (const st of body) {
          if (st.type === 'ReturnStatement' && st.argument && numeric(st.argument)) report(st);
          if (st.type === 'ExpressionStatement' && st.expression.type === 'AssignmentExpression' && st.expression.operator === '=' && same(st.expression.left, s) && numeric(st.expression.right)) report(st);
        }
      },
      // `switch (x) { case undefined: return 0 }` and `catch { return 0 }`
      SwitchCase(n) {
        if (n.test && isNullish(n.test)) for (const st of n.consequent) if (st.type === 'ReturnStatement' && st.argument && numeric(st.argument)) report(st);
      },
      CatchClause(n) {
        for (const st of n.body.body) if (st.type === 'ReturnStatement' && st.argument && numeric(st.argument)) report(st);
      },
      ObjectExpression(n) {
        // `{ phi: 7, ...o }` and `Object.assign({ phi: 7 }, o)`: a numeric default for a label-like field
        const parent = n.parent;
        const merged = n.properties.some((p) => p.type === 'SpreadElement')
          || (parent.type === 'CallExpression' && code.getText(parent.callee) === 'Object.assign' && parent.arguments.length > 1 && parent.arguments[0] === n);
        if (!merged) return;
        for (const p of n.properties) {
          if (p.type !== 'Property') continue;
          const key = p.key.type === 'Identifier' ? p.key.name : p.key.value;
          if (typeof key === 'string' && LABEL_KEY.test(key) && numeric(p.value)) report(p);
        }
      },
    };
  },
};
