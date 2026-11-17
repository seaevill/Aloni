import { signal } from '@preact/signals';
import { t } from '../i18n';
import { Crops, Parcels, Stock, Today } from './screens';
import { More } from './More';

type Tab = 'today' | 'crops' | 'parcels' | 'stock' | 'more';
const tab = signal<Tab>('today');
const TABS: Array<{ id: Tab; icon: string }> = [
  { id: 'today', icon: '☀️' }, { id: 'crops', icon: '🥬' }, { id: 'parcels', icon: '🗺️' }, { id: 'stock', icon: '📦' }, { id: 'more', icon: '⋯' },
];

export function App() {
  const screen = { today: Today, crops: Crops, parcels: Parcels, stock: Stock, more: More }[tab.value];
  const Screen = screen;
  return (
    <>
      <main><Screen /></main>
      <nav class="tabs" aria-label="Main">
        {TABS.map(({ id, icon }) => (
          <button key={id} data-tab={id} aria-current={tab.value === id ? 'page' : undefined} onClick={() => (tab.value = id)}>
            <span class="ico" aria-hidden="true">{icon}</span>
            {t(`tab.${id}`)}
          </button>
        ))}
      </nav>
    </>
  );
}
