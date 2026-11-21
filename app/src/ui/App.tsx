import { t, type I18nKey } from '../i18n';
import { Icon, type IconName } from './icons/Icon';
import { Crops } from './Crops';
import { Parcels, Today } from './screens';
import { Stock } from './Stock';
import { BackupBanner } from './Backup';
import { More } from './More';
import { RejectedList, SyncChip } from './states';
import { hashOf, tab, workerView, type FarmKey, type Tab } from './nav';
import { WorkerApp } from './WorkerApp';
import { DemoRibbon } from './DemoRibbon';
import { UpdateBar } from './UpdateBar';
import { LeaveBar } from './LeaveBar';
import { guarding, leaveAsk, tabReset } from './backstack';
import { typed } from '../pwa/update';
import { Toast } from './Toast';
import { Onboarding, useOnboarding } from './Onboarding';
import { AUTH_ENABLED, DEMO_FARM_ID } from '../config';
import { session } from '../auth/gotrue';
import { useRows } from './useRows';
import { useEffect } from 'preact/hooks';
import { activeFarm, db } from '../db';
import { putLocal } from '../repo';

// Keys are spelled out as literals so the i18n key test can see them (no dynamic t(`tab.${id}`)).
const TABS: Array<{ id: Tab; icon: IconName; label: I18nKey }> = [
  { id: 'today', icon: 'today', label: 'tab.today' },
  { id: 'crops', icon: 'crops', label: 'ui.tab.crops' },
  { id: 'parcels', icon: 'parcels', label: 'tab.parcels' },
  { id: 'stock', icon: 'stock', label: 'tab.stock' },
  { id: 'more', icon: 'more', label: 'tab.more' },
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
    if (typed.value && guarding.value > 0) { leaveAsk.value = { stay: () => { leaveAsk.value = undefined; }, go }; return; }
    go();
  };
  const [onboarding, endOnboarding] = useOnboarding();
  const roster = useRows('workers');
  const isWorkerAccount = AUTH_ENABLED && !!session.value && !!roster.rows?.some((w) => !w.deleted_at && w.user_id === session.value?.user_id); // a roster worker's own account: no owner screens
  if (isWorkerAccount || workerView.value !== undefined) return <><UpdateBar /><WorkerApp /><Toast /></>;
  if (onboarding) return <main><Onboarding done={endOnboarding} /></main>;   // owner first run only: never reached by the worker route above
  return (
    <>
      <main><UpdateBar /><LeaveBar /><DemoRibbon /><SyncChip /><RejectedList /><BackupBanner /><Screen /></main>
      <Toast />
      <nav class="tabs" aria-label={t('nav.main')}>
        {TABS.map(({ id, icon, label }) => (
          <button key={id} data-tab={id} aria-current={tab.value === id ? 'page' : undefined} onClick={() => goTab(id)}>
            <span class="ico" aria-hidden="true"><Icon name={icon} /></span>
            <span class="lbl">{t(label)}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
