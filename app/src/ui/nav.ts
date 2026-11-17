import { signal } from '@preact/signals';

export type Tab = 'today' | 'crops' | 'parcels' | 'stock' | 'more';
/** The open tab; screens may send the farmer to another one (e.g. «add a field» from an empty screen). */
export const tab = signal<Tab>('today');
