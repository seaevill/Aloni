// Where each planting sits in the parcel sketch. No planting has a recorded position yet, so the sketch splits the parcel width by the areas, in order: an ILLUSTRATION (the screen says so), never a measured place.
// The areas are typed text (comma or point); an unreadable area, a parcel area of 0, or plantings that add up to more than the parcel give NO marks (the screen then says the place is unknown), never a guess.
export interface PlantingMark { id: string; from: number; to: number }
const read = (v: string): number | undefined => { const n = parseFloat(v.trim().split(',').join('.')); return Number.isFinite(n) && n >= 0 ? n : undefined; };

export function plantingMarks(parcelArea: string, plantings: ReadonlyArray<{ id: string; area: string }>): PlantingMark[] {
  const whole = read(parcelArea);
  if (whole === undefined || whole <= 0) return [];
  const out: PlantingMark[] = []; let at = 0;
  for (const p of plantings) {
    const a = read(p.area);
    if (a === undefined) return [];
    out.push({ id: p.id, from: at / whole, to: (at + a) / whole });
    at += a;
  }
  return at > whole ? [] : out;
}
