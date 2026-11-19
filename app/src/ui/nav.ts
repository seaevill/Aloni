import { signal } from '@preact/signals';

export type Tab = 'today' | 'crops' | 'parcels' | 'stock' | 'more';
/** The open tab; screens may send the farmer to another one (e.g. «add a field» from an empty screen). */
export const tab = signal<Tab>('today');

/** The worker view (Demo farm only, same phone): the id of the roster worker being shown, or undefined for the owner's own screens. */
export const workerView = signal<string | undefined>(undefined);

/** «Προσθήκη χωραφιού» on an empty Σήμερα opens the parcel form directly (one tap). */
export const openParcelForm = signal(false);

// The address says where you are: #/<own|demo>/<tab>. A reload (or a cold start) comes back to the same farm and tab; the same is kept in the device-only setting `ui_state` when the address is empty.
export type FarmKey = 'own' | 'demo';
export const TABS_IN_ORDER: readonly Tab[] = ['today', 'crops', 'parcels', 'stock', 'more'];
export function parseHash(hash: string): { farm: FarmKey; tab: Tab } | undefined {
  const m = /^#\/(own|demo)\/(today|crops|parcels|stock|more)$/.exec(hash);
  return m ? { farm: m[1] as FarmKey, tab: m[2] as Tab } : undefined;
}
export const hashOf = (farm: FarmKey, t: Tab): string => `#/${farm}/${t}`;
export function savedState(v: unknown): { farm: FarmKey; tab: Tab } | undefined {
  const o = v as { farm?: unknown; tab?: unknown } | null | undefined;
  return o && (o.farm === 'own' || o.farm === 'demo') && TABS_IN_ORDER.includes(o.tab as Tab) ? { farm: o.farm, tab: o.tab as Tab } : undefined;
}
