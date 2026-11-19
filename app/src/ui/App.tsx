import { t, type I18nKey } from '../i18n';
import { Crops } from './Crops';
import { Parcels, Today } from './screens';
import { Stock } from './Stock';
import { BackupBanner } from './Backup';
import { More } from './More';
import { RejectedList, SyncChip } from './states';
import { hashOf, tab, workerView, type FarmKey, type Tab } from './nav';
import { WorkerApp } from './WorkerApp';
import { DemoBanner } from './DemoBanner';
import { UpdateBar } from './UpdateBar';
import { LeaveBar } from './LeaveBar';
import { guarding, leaveAsk, tabReset } from './backstack';
import { dirty } from '../pwa/update';
import { Toast } from './Toast';
import { AUTH_ENABLED, DEMO_FARM_ID } from '../config';
import { session } from '../auth/gotrue';
import { useRows } from './useRows';
import { useEffect } from 'preact/hooks';
import { activeFarm, db } from '../db';
import { putLocal } from '../repo';

// Keys are spelled out as literals so the i18n key test can see them (no dynamic t(`tab.${id}`)).
const Icon = ({ d, dots = false }: { d: string; dots?: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    {dots ? <><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></> : <path d={d} />}
  </svg>
);
// Line icons (no emoji: the same look on every phone). Labels are ONE short word each so they never wrap in the 75 px column.
const TABS: Array<{ id: Tab; icon: preact.JSX.Element; label: I18nKey }> = [
  { id: 'today', icon: <Icon d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4M12 8a4 4 0 100 8 4 4 0 000-8z" />, label: 'tab.today' },
  { id: 'crops', icon: <Icon d="M5 19C5 10 11 5 19 5c0 8-5 14-14 14zM5 19l8-8" />, label: 'tab.crops' },
  { id: 'parcels', icon: <Icon d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14" />, label: 'tab.parcels' },
  { id: 'stock', icon: <Icon d="M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10" />, label: 'tab.stock' },
  { id: 'more', icon: <Icon d="" dots />, label: 'tab.more' },
];

export function App() {
  const screen = { today: Today, crops: Crops, parcels: Parcels, stock: Stock, more: More }[tab.value];
  const Screen = screen;
  // the worker view survives a reload: the roster worker being shown is kept on THIS phone (a device-local setting, never synced)
  useEffect(() => { void db.settings.get('worker_view').then((r) => { const v = r?.value as { id?: unknown; farm?: unknown } | null | undefined; if (v && typeof v.id === 'string' && typeof v.farm === 'string' && workerView.value === undefined) { activeFarm.value = v.farm; workerView.value = v.id; } }); }, []);
  useEffect(() => { void putLocal(db, 'worker_view', workerView.value === undefined ? null : { id: workerView.value, farm: activeFarm.value }); }, [workerView.value]);
  useEffect(() => {      // the address and the device-only «ui_state» follow the farm and the tab (T7)
    const farm: FarmKey = activeFarm.value === DEMO_FARM_ID ? 'demo' : 'own';
    history.replaceState(history.state, '', hashOf(farm, tab.value));
    void putLocal(db, 'ui_state', { farm, tab: tab.value });
  }, [activeFarm.value, tab.value]);
  /** A tab tap with something typed asks first, like the Back gesture: nothing typed is lost silently. */
  const goTab = (id: typeof tab.value) => {
    const go = () => { leaveAsk.value = undefined; if (tab.value === id) tabReset.value++; else tab.value = id; };
    if (dirty.value && guarding.value > 0) { leaveAsk.value = { stay: () => { leaveAsk.value = undefined; }, go }; return; }
    go();
  };
  const roster = useRows('workers');
  const isWorkerAccount = AUTH_ENABLED && !!session.value && !!roster.rows?.some((w) => !w.deleted_at && w.user_id === session.value?.user_id); // a roster worker's own account: no owner screens
  if (isWorkerAccount || workerView.value !== undefined) return <><UpdateBar /><WorkerApp /><Toast /></>;
  return (
    <>
      <main><UpdateBar /><LeaveBar /><DemoBanner /><SyncChip /><RejectedList /><BackupBanner /><Screen /></main>
      <Toast />
      <nav class="tabs" aria-label={t('nav.main')}>
        {TABS.map(({ id, icon, label }) => (
          <button key={id} data-tab={id} aria-current={tab.value === id ? 'page' : undefined} onClick={() => goTab(id)}>
            <span class="ico" aria-hidden="true">{icon}</span>
            <span class="lbl">{t(label)}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
