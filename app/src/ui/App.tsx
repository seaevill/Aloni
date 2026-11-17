import { signal } from '@preact/signals';
import { t, type I18nKey } from '../i18n';
import { Crops, Parcels, Stock, Today } from './screens';
import { More } from './More';

type Tab = 'today' | 'crops' | 'parcels' | 'stock' | 'more';
const tab = signal<Tab>('today');
// Keys are spelled out as literals so the i18n key test can see them (no dynamic t(`tab.${id}`)).
const TABS: Array<{ id: Tab; icon: string; label: I18nKey }> = [
  { id: 'today', icon: '☀️', label: 'tab.today' },
  { id: 'crops', icon: '🥬', label: 'tab.crops' },
  { id: 'parcels', icon: '🗺️', label: 'tab.parcels' },
  { id: 'stock', icon: '📦', label: 'tab.stock' },
  { id: 'more', icon: '⋯', label: 'tab.more' },
];

export function App() {
  const screen = { today: Today, crops: Crops, parcels: Parcels, stock: Stock, more: More }[tab.value];
  const Screen = screen;
  return (
    <>
      <main><Screen /></main>
      <nav class="tabs" aria-label="Main">
        {TABS.map(({ id, icon, label }) => (
          <button key={id} data-tab={id} aria-current={tab.value === id ? 'page' : undefined} onClick={() => (tab.value = id)}>
            <span class="ico" aria-hidden="true">{icon}</span>
            {t(label)}
          </button>
        ))}
      </nav>
    </>
  );
}
