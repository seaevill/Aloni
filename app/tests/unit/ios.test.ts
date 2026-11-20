import { describe, expect, it } from 'vitest';
import { isIos } from '../../src/backup/warnings';

describe('isIos', () => {
  it('iPhone', () => expect(isIos('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 5)).toBe(true));
  it('a modern iPad says Macintosh but has a touch screen', () => expect(isIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe(true));
  it('a real Mac has no touch screen', () => expect(isIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe(false));
  it('Android', () => expect(isIos('Mozilla/5.0 (Linux; Android 14)', 5)).toBe(false));
});
