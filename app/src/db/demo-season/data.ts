// DEMO SEASON (queue item 32a): what is planted where, and what happened. FICTIONAL. Days are OFFSETS from today (negative = past), so the season moves with the calendar at every load.
// crop = the shared crop slug of the Demo farm. `strip` = which slice (0..parts-1 of `parts`, west to east) of the parcel the planting's drawn outline covers; `area` = the TYPED στρέμματα (the authority), a little under the drawn outline.
export interface SeasonPlanting { id: string; parcel: string; crop: string; strip: [number, number]; area: string; sown: number; status: 'planned' | 'growing' | 'harvesting' | 'finished'; variety?: string }
export const SEASON_PLANTINGS: readonly SeasonPlanting[] = [
  { id: 'pl1', area: '11.6', parcel: 'S1', crop: 'spinach', strip: [0, 2], sown: -48, status: 'harvesting' },
  { id: 'pl2', area: '10.8', parcel: 'S1', crop: 'chard', strip: [1, 2], sown: -41, status: 'growing' },
  { id: 'pl3', area: '5.5', parcel: 'S2', crop: 'parsley', strip: [0, 2], sown: -85, status: 'harvesting' },
  { id: 'pl4', area: '5.3', parcel: 'S2', crop: 'dill', strip: [1, 2], sown: -30, status: 'growing' },
  { id: 'pl5', area: '3.0', parcel: 'S3', crop: 'rocket', strip: [0, 3], sown: -32, status: 'harvesting' },
  { id: 'pl6', area: '3.5', parcel: 'S3', crop: 'coriander', strip: [1, 3], sown: -26, status: 'growing' },
  { id: 'pl7', area: '2.6', parcel: 'S3', crop: 'spinach', strip: [2, 3], sown: -9, status: 'growing' },
  { id: 'pl8', area: '8.7', parcel: 'S4', crop: 'leek', strip: [0, 1], sown: -88, status: 'growing' },
  { id: 'pl9', area: '2.8', parcel: 'S5', crop: 'endive', strip: [0, 2], sown: -22, status: 'growing' },
  { id: 'pl10', area: '3.3', parcel: 'S5', crop: 'chicory', strip: [1, 2], sown: -64, status: 'harvesting' },
  { id: 'pl11', area: '3.9', parcel: 'S6', crop: 'rocket', strip: [0, 1], sown: -12, status: 'growing' },
  { id: 'pl12', area: '2.4', parcel: 'S7', crop: 'parsley', strip: [0, 1], sown: 4, status: 'planned' },
];

// Harvest records (older than a week left the farm directly; only the newest crates are still in the store): planting, day offset, crates as TYPED (a text the app must read; «δεκαπέντε» is deliberately unreadable → shown as «άγνωστο», never as 0), where it went.
export interface SeasonHarvest { id: string; planting: string; day: number; crates: string; dest?: 'store' | 'dispatch' }
export const SEASON_HARVESTS: readonly SeasonHarvest[] = [
  { id: 'h1', planting: 'pl3', day: -40, crates: '14', dest: 'dispatch' }, { id: 'h2', planting: 'pl3', day: -33, crates: '18', dest: 'dispatch' }, { id: 'h3', planting: 'pl3', day: -26, crates: '16', dest: 'dispatch' },
  { id: 'h4', planting: 'pl3', day: -19, crates: '20', dest: 'dispatch' }, { id: 'h5', planting: 'pl3', day: -12, crates: '17', dest: 'dispatch' }, { id: 'h6', planting: 'pl3', day: -5, crates: '19', dest: 'store' },
  { id: 'h7', planting: 'pl10', day: -21, crates: '30', dest: 'dispatch' }, { id: 'h8', planting: 'pl10', day: -14, crates: '28', dest: 'dispatch' }, { id: 'h9', planting: 'pl10', day: -7, crates: '26', dest: 'dispatch' },
  { id: 'h10', planting: 'pl1', day: -4, crates: '22', dest: 'store' }, { id: 'h11', planting: 'pl1', day: -1, crates: '24', dest: 'store' },
  { id: 'h12', planting: 'pl5', day: -6, crates: '12', dest: 'store' }, { id: 'h13', planting: 'pl5', day: -2, crates: 'δεκαπέντε' },
  { id: 'h14', planting: 'pl8', day: -45, crates: '40', dest: 'dispatch' },
];

// Soil analyses (typed values as a lab would give them; one parcel has none on purpose → «άγνωστο»).
export interface SeasonSoil { parcel: string; day: number; ph: string; ec: string; notes: string }
export const SEASON_SOIL: readonly SeasonSoil[] = [
  { parcel: 'S1', day: -80, ph: '7.8', ec: '0.9', notes: 'OM 1,6 % · N 18 · P 22 · K 280 (επίδειξη)' },
  { parcel: 'S2', day: -80, ph: '7.6', ec: '0.7', notes: 'OM 2,1 % · N 24 · P 30 · K 310 (επίδειξη)' },
  { parcel: 'S3', day: -75, ph: '8.0', ec: '1.1', notes: 'OM 1,4 % · N 15 · P 19 · K 250 (επίδειξη)' },
  { parcel: 'S4', day: -75, ph: '7.9', ec: '0.8', notes: 'OM 1,8 % · N 20 · P 25 · K 290 (επίδειξη)' },
  { parcel: 'S5', day: -60, ph: '7.7', ec: '1.3', notes: 'OM 1,5 % · N 17 · P 21 · K 265 (επίδειξη)' },
];

// «Κοπή / καθαρισμός» (method: shredder | hand | other) and «Λίπανση / Άρδευση» records the owner typed (N form as the package says, kg N per στρέμμα, minutes or m³).
export const SEASON_CUTS = [{ id: 'c1', parcel: 'S4', day: -52, method: 'shredder' }, { id: 'c2', parcel: 'S6', day: -20, method: 'hand' }, { id: 'c3', parcel: 'S1', day: -50, method: 'shredder' }] as const;
export const SEASON_WORK: ReadonlyArray<{ id: string; parcel: string; day: number; kind: 'fertilise' | 'irrigate'; n_form?: string; n_kg_per_str?: string; minutes?: string; m3?: string }> = [
  { id: 'w1', parcel: 'S1', day: -35, kind: 'fertilise', n_form: 'νιτρική αμμωνία 34,5-0-0', n_kg_per_str: '4,5' },
  { id: 'w2', parcel: 'S3', day: -18, kind: 'fertilise', n_form: 'ουρία 46-0-0', n_kg_per_str: '3' },
  { id: 'w3', parcel: 'S2', day: -28, kind: 'fertilise', n_form: 'νιτρικό κάλιο 13-0-46', n_kg_per_str: '2,5' },
  { id: 'w4', parcel: 'S1', day: -6, kind: 'irrigate', minutes: '90', m3: '14' },
  { id: 'w5', parcel: 'S2', day: -4, kind: 'irrigate', minutes: '120' },
  { id: 'w6', parcel: 'S3', day: -3, kind: 'irrigate', m3: '9,5' },
  { id: 'w7', parcel: 'S5', day: -8, kind: 'irrigate', minutes: '75', m3: '6' },
];

// Roster workers of the Demo season (FICTIONAL first names only; the roster holds a name and nothing else).
export const SEASON_WORKERS = ['Νίκος', 'Ελένη', 'Θεόδωρος'] as const;

// Sprays (queue item 32b), written through the app's OWN spray builder with the sample products of the Demo farm. Dose = the label record's own text, never typed here. Products: the sample ids PR01…PR17.
// Deliberate hard cases: s4 leaves rocket (pl5) IN its waiting period (PHI 3 days, until +2); s6 sprays TODAY (re-entry period running on parcel S3); s8 uses the label that lacks its maximum number of applications (blocked: waiting period unknown); s9 an UNSIGNED label (waiting period unknown); s10 empties the product's stock.
export interface SeasonSpray { id: string; planting: string; product: string; day: number; worker: number; lotQty?: string }
export const SEASON_SPRAYS: readonly SeasonSpray[] = [
  { id: 's1', planting: 'pl1', product: 'PR06', day: -20, worker: 0 },
  { id: 's2', planting: 'pl3', product: 'PR02', day: -30, worker: 1 },
  { id: 's3', planting: 'pl3', product: 'PR08', day: -10, worker: 1 },
  { id: 's4', planting: 'pl5', product: 'PR08', day: -1, worker: 2 },
  { id: 's5', planting: 'pl9', product: 'PR13', day: -3, worker: 0 },
  { id: 's6', planting: 'pl7', product: 'PR02', day: 0, worker: 2 },
  { id: 's8', planting: 'pl8', product: 'PR08', day: -8, worker: 1 },
  { id: 's9', planting: 'pl11', product: 'PR07', day: -4, worker: 2 },
  { id: 's10', planting: 'pl9', product: 'PR03', day: -15, worker: 0, lotQty: '0.1' },
];
