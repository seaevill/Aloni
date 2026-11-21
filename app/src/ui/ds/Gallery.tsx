import { BigNum, Card, Chip, HeroCard, IconTile, ListRow, PageHead, SectionHead, Sparkline, Tag, TONES, WeatherStrip, WeekBars, type Tone, type WeatherDay, type WeekBar } from './index';
import { Icon } from '../icons/Icon';

// Every design-system component with fixed sample texts (Greek, Demo data only: nothing here is a record). Used for screenshots and for the gallery e2e. Reached by `?ds-gallery` in a build with VITE_DS_GALLERY=true.
const SAMPLE: Record<Tone, string> = {
  hold: 'Αναμονή λήγει Δευ 23 Νοε', blocked: 'ΑΠΟΚΛΕΙΣΜΕΝΟ', warn: 'Κοπή από Πέμ 3 Δεκ', unsigned: 'Χωρίς υπογραφή γεωπόνου',
  frost: 'Παγετός απόψε', ready: 'Έτοιμο για κοπή', unknown: 'Αναμονή: άγνωστο', info: 'Πληροφοριακό',
};
const TAGS = ['FRAC 28', 'Λίπασμα', 'Μυκητοκτόνο'];
const TITLE = 'ds gallery (Demo)';
const PILL = 'Σήμερα';
const PILL2 = 'Φυτά';
const SUB = 'Επίδειξη – φανταστικά στοιχεία';
const ROWS: Array<[string, string]> = [['Σπανάκι', '2 φυτεύσεις · 1 στρ.'], ['Ρόκα', '1 φύτευση · 0,6 στρ.'], ['Μαρούλι', '3 φυτεύσεις · 2 στρ.']];
const WEEKS: WeekBar[] = [
  { name: 'Εβδ. 47', orders: 100, eligible: 80, unknown: 20 }, { name: 'Εβδ. 48', orders: 60, eligible: 80, unknown: null }, { name: 'Εβδ. 49', orders: null, eligible: null, unknown: 40 }, { name: 'Εβδ. 50', orders: 80, eligible: 80, unknown: null },
];
const DAYS: WeatherDay[] = [{ name: 'Δευ', tmax: '18°', tmin: '9°', rain: '0 mm', wind: '12 km/h' }, { name: 'Τρί' }, { name: 'Τετ', tmax: '17°', tmin: '8°' }];
const CAP = ['Για κοπή σήμερα', 'Κλούβες 7 ημ.', 'Παραγγελίες εβδ.'];
const FILL = Array.from({ length: 30 }, (_, i) => `γραμμή ${i + 1}`);

export function Gallery() {
  return (
    <main data-testid="ds-gallery">
      <PageHead heading={TITLE} subtitle={SUB} />
      <HeroCard pill={PILL} heading={SAMPLE.blocked} />
      <SectionHead heading={PILL2} note={SUB} />
      <Card testid="gallery-card">
        {ROWS.map(([name, meta]) => <ListRow key={name} icon={<IconTile name="crops" />} heading={name} meta={meta} trailing={<Chip tone="info">{SAMPLE.info}</Chip>} onClick={() => undefined} />)}
        <ListRow heading={ROWS[0]![0]} meta={ROWS[0]![1]} trailing={<Icon name="lock" />} />
      </Card>
      <section data-testid="gallery-chips">
        {TONES.map((tone) => <p key={tone}><Chip tone={tone}>{SAMPLE[tone]}</Chip></p>)}
      </section>
      <section data-testid="gallery-viz">
        <BigNum caption={CAP[0]!} value="12" unit="κλούβες" />
        <BigNum caption={CAP[1]!} value={undefined} />
        <BigNum caption={CAP[2]!} value="0" size="small" />
        <Sparkline values={[3, null, 5]} caption={CAP[1]!} />
        <Sparkline values={[2, 4, 3, 6]} caption={CAP[1]!} />
        <WeekBars weeks={WEEKS} />
        <WeatherStrip days={DAYS} />
      </section>
      <section data-testid="gallery-fill">{FILL.map((x) => <p key={x}>{x}</p>)}</section>
      <section data-testid="gallery-tags">
        {TAGS.map((x) => <Tag key={x}>{x}</Tag>)}
      </section>
    </main>
  );
}
