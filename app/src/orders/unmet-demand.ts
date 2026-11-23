import type { StoreLine } from '../stock/store-stock';

// PROTOTYPE (not wired to any screen): unmet demand = the crates ordered − the crates VERIFIED to be in the store. Offline, pure, tested; it commits to nothing and promises nothing to a customer.
// «Verified» = crates whose harvest record says «store» minus the crates the owner marked as loaded (StoreLine.left). Never counted as available: records without a destination («unknown»),
// records with an unreadable crate number, direct-dispatch crates (already gone), plantings that are still growing or held by a waiting period (they are not crates yet).
// A negative `left` (more loaded than the store records show) is not netted against the demand: it is flagged, and the verified quantity is the zero it cannot go below.
export interface UnmetRow {
  slug: string; ordered: number; verified: number; unmet: number;
  /** crates that are NOT counted because their destination or number is unknown: the owner can look at them, the sum never includes them */
  unverified: number; flags: ('negative-store' | 'unreadable-records')[];
}

const qty = (xs: readonly (number | undefined)[]): number => xs.filter((x): x is number => x !== undefined).reduce((a, b) => a + b, Number('0'));
const NONE = qty([]);

export function unmetDemand(ordered: Readonly<Record<string, number>>, store: readonly StoreLine[]): UnmetRow[] {
  const bySlug = new Map(store.map((l) => [l.slug, l]));
  const slugs = [...new Set([...Object.keys(ordered), ...store.map((l) => l.slug)])].sort();
  return slugs.map((slug): UnmetRow => {
    const o = qty([ordered[slug]]); const line = bySlug.get(slug);
    const left = qty([line?.left]);
    const verified = left > NONE ? left : NONE;
    const flags: UnmetRow['flags'] = [];
    if (left < NONE) flags.push('negative-store');
    if (qty([line?.unreadable]) > NONE) flags.push('unreadable-records');
    return { slug, ordered: o, verified, unmet: o > verified ? o - verified : NONE, unverified: qty([line?.unknown]), flags };
  }).filter((r) => r.ordered > NONE || r.verified > NONE || r.unverified > NONE);
}
