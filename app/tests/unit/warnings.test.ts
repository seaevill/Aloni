import { describe, expect, it } from 'vitest';
import { backupStale, storageWarnings } from '../../src/backup/warnings';

const DAY = 86_400_000;
const now = Date.parse('2026-11-20T12:00:00Z');

describe('backupStale: warn when there is data and no backup newer than 7 days', () => {
  it('nothing to lose = no warning', () => expect(backupStale(undefined, now, false)).toBe(false));
  it('never backed up = warn', () => expect(backupStale(undefined, now, true)).toBe(true));
  it('6 days = fine, 8 days = warn, exactly 7 days = fine', () => {
    expect(backupStale(new Date(now - 6 * DAY).toISOString(), now, true)).toBe(false);
    expect(backupStale(new Date(now - 7 * DAY).toISOString(), now, true)).toBe(false);
    expect(backupStale(new Date(now - 8 * DAY).toISOString(), now, true)).toBe(true);
  });
  it('an unreadable date counts as stale, never as fresh', () => expect(backupStale('garbage', now, true)).toBe(true));
});

describe('storageWarnings', () => {
  it('iPhone in Safari (not on the Home Screen) is warned; on the Home Screen it is not', () => {
    expect(storageWarnings({ ios: true, standalone: false, persisted: true })).toEqual(['warn.homescreen']);
    expect(storageWarnings({ ios: true, standalone: true, persisted: true })).toEqual([]);
  });
  it('refused persistent storage is warned about, an unknown answer is not', () => {
    expect(storageWarnings({ ios: false, standalone: false, persisted: false })).toEqual(['warn.persist']);
    expect(storageWarnings({ ios: false, standalone: false, persisted: undefined })).toEqual([]);
  });
});
