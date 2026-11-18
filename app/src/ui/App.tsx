import { t, type I18nKey } from '../i18n';
import { Crops } from './Crops';
import { Parcels, Today } from './screens';
import { Stock } from './Stock';
import { BackupBanner } from './Backup';
import { More } from './More';
import { SyncChip } from './states';
import { tab, workerView, type Tab } from './nav';
import { WorkerApp } from './WorkerApp';
import { DemoBanner } from './DemoBanner';
import { Toast } from './Toast';

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
  if (workerView.value !== undefined) return <><WorkerApp /><Toast /></>;
  return (
    <>
      <main><DemoBanner /><SyncChip /><BackupBanner /><Screen /></main>
      <Toast />
      <nav class="tabs" aria-label={t('nav.main')}>
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
