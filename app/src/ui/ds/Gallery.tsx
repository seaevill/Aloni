import { Chip, Tag, TONES, type Tone } from './index';

// Every design-system component with fixed sample texts (Greek, Demo data only: nothing here is a record). Used for screenshots and for the gallery e2e. Reached by `?ds-gallery` in a build with VITE_DS_GALLERY=true.
const SAMPLE: Record<Tone, string> = {
  hold: 'Αναμονή λήγει Δευ 23 Νοε', blocked: 'ΑΠΟΚΛΕΙΣΜΕΝΟ', warn: 'Κοπή από Πέμ 3 Δεκ', unsigned: 'Χωρίς υπογραφή γεωπόνου',
  frost: 'Παγετός απόψε', ready: 'Έτοιμο για κοπή', unknown: 'Αναμονή: άγνωστο', info: 'Πληροφοριακό',
};
const TAGS = ['FRAC 28', 'Λίπασμα', 'Μυκητοκτόνο'];
const TITLE = 'ds gallery (Demo)';

export function Gallery() {
  return (
    <main data-testid="ds-gallery">
      <h1>{TITLE}</h1>
      <section data-testid="gallery-chips">
        {TONES.map((tone) => <p key={tone}><Chip tone={tone}>{SAMPLE[tone]}</Chip></p>)}
      </section>
      <section data-testid="gallery-tags">
        {TAGS.map((x) => <Tag key={x}>{x}</Tag>)}
      </section>
    </main>
  );
}
