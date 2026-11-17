// Flags use of a GLOBAL name (alert, process, window, performance, ...) only when it is NOT declared in the code:
// a parameter or variable called `alert`, `window` (spray window!) or `process` is domain vocabulary and stays allowed.
// Option: { names: string[], message: string }
export default {
  meta: { type: 'problem', schema: [{ type: 'object', properties: { names: { type: 'array', items: { type: 'string' } }, message: { type: 'string' } }, additionalProperties: false }], messages: { g: '{{message}}' } },
  create(context) {
    const { names = [], message = 'Global not allowed here.' } = context.options[0] ?? {};
    const wanted = new Set(names);
    const code = context.sourceCode;
    const declared = (node, name) => {
      for (let s = code.getScope(node); s; s = s.upper) {
        const v = s.set.get(name);
        if (v) return v.defs.length > 0; // lib globals have no definition
      }
      return false;
    };
    return {
      Identifier(node) {
        if (!wanted.has(node.name)) return;
        const p = node.parent;
        if (p.type === 'MemberExpression' && p.property === node && !p.computed) return; // x.alert
        if (p.type === 'Property' && p.key === node && !p.computed && p.parent.type === 'ObjectExpression') return; // { alert: 1 }
        if (p.type === 'TSTypeReference' || p.type === 'TSQualifiedName') return;
        if (declared(node, node.name)) return;
        context.report({ node, messageId: 'g', data: { message } });
      },
    };
  },
};
