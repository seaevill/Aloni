/** A moment as a UTC second «YYYY-MM-DDTHH:MM:SSZ» (the only form the waiting-period code accepts), or undefined for an unusable date. */
export function instantOf(d: Date): string | undefined {
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}
