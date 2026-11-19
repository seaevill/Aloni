import type { Row } from '../db/schema';

// Parcels and plantings are edited APPEND-ONLY (migration 0024): the row keeps the CURRENT values (other records point at its id) and `edits` keeps every earlier state:
// one entry per change {at, reason, before: the previous values of the fields that changed}. A change needs a reason; the history is never shortened or rewritten.
export interface Edit { at: string; reason: string; before: Record<string, unknown> }
export type EditResult = { kind: 'ok'; row: Row } | { kind: 'nochange' } | { kind: 'reason' };

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** The recorded edits of a row, oldest first; anything that is not a well-formed entry is skipped (never invented). */
export function editsOf(row: Row): Edit[] {
  if (!Array.isArray(row.edits)) return [];
  return row.edits.flatMap((e: unknown) => {
    if (typeof e !== 'object' || e === null) return [];
    const x = e as Record<string, unknown>;
    return typeof x.at === 'string' && typeof x.reason === 'string' && typeof x.before === 'object' && x.before !== null ? [{ at: x.at, reason: x.reason, before: x.before as Record<string, unknown> }] : [];
  });
}

/**
 * The row after an edit: `changes` holds the new value of every field the form offers (undefined = the field is empty now). Fields that did not change stay out of `before`.
 * Nothing changed → 'nochange'; something changed but no reason → 'reason'.
 */
export function applyEdit(existing: Row, changes: Record<string, unknown>, reason: string, nowIso: string): EditResult {
  const before: Record<string, unknown> = {};
  const next: Row = { ...existing };
  for (const [field, value] of Object.entries(changes)) {
    if (same(existing[field], value)) continue;
    before[field] = existing[field] ?? null;
    if (value === undefined) delete next[field]; else next[field] = value;
  }
  if (Object.keys(before).length === 0) return { kind: 'nochange' };
  if (reason.trim() === '') return { kind: 'reason' };
  // `edit_reason` is what the SERVER reads: it writes the history entry itself (previous values from its own database, its own clock); the local `edits` copy is for the screen until the next pull
  return { kind: 'ok', row: { ...next, updated_at: nowIso, edit_reason: reason.trim(), edits: [...editsOf(existing), { at: nowIso, reason: reason.trim(), before }] } };
}

/** A stored decimal text («12.5») in the farmer's comma form for a form box («12,5»); anything else is an empty box. */
export const commaText = (v: unknown): string => (typeof v === 'string' ? v.split('.').join(',') : '');
