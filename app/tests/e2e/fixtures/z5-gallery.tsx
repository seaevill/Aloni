import { render } from 'preact';
import { HarvestHeat } from '../../../src/ui/cx/HarvestHeat';
import { MonthRing } from '../../../src/ui/cx/MonthRing';
import { TipsCard } from '../../../src/ui/cx/TipsCard';

const weeks = Array.from({ length: 12 }, (_, i) => String(i + 1));
const months = ['Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μάι', 'Ιουν', 'Ιουλ', 'Αυγ', 'Σεπ', 'Οκτ', 'Νοε', 'Δεκ'];
const root = document.getElementById('root');
if (!root) throw new Error('Missing fixture root');

render(
  <main>
    <h1>Δοκιμή προβολών</h1>
    <HarvestHeat heading="Καταγεγραμμένες κλούβες" weeks={weeks} rows={[
      { parcel: 'Πάχη', cells: [{ week: '1', crates: 12 }, { week: '2', excluded: true }] },
    ]} unknown="άγνωστο" empty="Χωράφι" />
    <MonthRing heading="Μήνες σποράς" months={months} recorded={[2, 10]} empty="Δεν υπάρχουν καταγραφές." />
    <TipsCard heading="Συμβουλές καλλιέργειας" banner="Γενικές πληροφορίες – όχι σύσταση"
      content={{ tips: 'Πιάστε απαλά τα φύλλα.', strength: 'Τρυφερά φύλλα', weakness: 'Ευαίσθητοι μίσχοι', problems: ['Μάρανση'] }} />
  </main>, root,
);
