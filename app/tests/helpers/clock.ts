export const TEST_NOW = '2026-11-20T10:30:00Z';
export const DAY_MS = 86_400_000;

export function athensDateTime(instant: number): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Athens', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(instant)).replace(' ', 'T');
}
