// General literature ranges of soil pH per crop: information only, NOT signed by an agronomist and NOT a threshold of the app (nothing is decided from them).
// Every entry names its source; sources can disagree and then both are listed. A crop or measurement without an entry says «δεν υπάρχει πηγή». Numbers are copied as printed by the source, never converted or rounded.
export interface CropRange { crop: string; measure: 'ph'; low: string; high: string; source: string; url: string }

export const CROP_RANGES: readonly CropRange[] = [
  { crop: 'spinach', measure: 'ph', low: '6.5', high: '8', source: 'University of Minnesota Extension', url: 'https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/growing-spinach-and-swiss-chard' },
  { crop: 'spinach', measure: 'ph', low: '6.0', high: '6.5', source: 'UC IPM (University of California)', url: 'https://ipm.ucanr.edu/home-and-landscape/cultural-tips-for-growing-spinach/' },
];

export const rangesFor = (crop: string, measure: CropRange['measure']): CropRange[] => CROP_RANGES.filter((r) => r.crop === crop && r.measure === measure);
