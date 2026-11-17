import { signal } from '@preact/signals';

export type Tab = 'today' | 'crops' | 'parcels' | 'stock' | 'more';
/** The open tab; screens may send the farmer to another one (e.g. «add a field» from an empty screen). */
export const tab = signal<Tab>('today');

/** The worker view (Demo farm only, same phone): the id of the roster worker being shown, or undefined for the owner's own screens. */
export const workerView = signal<string | undefined>(undefined);
