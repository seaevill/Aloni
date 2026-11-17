// W01: the single write path. Writing to a Dexie table or collection outside src/repo and src/db skips the outbox,
// the Demo-farm rule and the append-only guard. Decided by TYPE (the receiver is a Dexie Table or Collection), so Map.delete / Set.add are fine.
import { ESLintUtils } from '@typescript-eslint/utils';

const WRITES = /^(put|add|update|upsert|delete|clear|modify|bulkPut|bulkAdd|bulkDelete|bulkUpdate)$/;
const MSG = '[W01] Do not write to Dexie directly: use repo.put() / repo.putSetting() (one transaction with the outbox, demo never queued, append-only guarded).';

export default {
  meta: { type: 'problem', schema: [], messages: { w01: MSG } },
  create(context) {
    const services = ESLintUtils.getParserServices(context);
    const checker = services.program.getTypeChecker();
    return {
      CallExpression(n) {
        const c = n.callee;
        const name = c.type === 'MemberExpression' && !c.computed ? c.property.name : c.type === 'MemberExpression' && c.property.type === 'Literal' ? c.property.value : '';
        if (typeof name !== 'string' || !WRITES.test(name)) return;
        const sym = checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(c.object)).getSymbol();
        const file = sym?.declarations?.[0]?.getSourceFile().fileName ?? '';
        if (sym && /^(Table|Collection)$/.test(sym.name) && file.includes('/dexie/')) context.report({ node: n, messageId: 'w01' });
      },
    };
  },
};
