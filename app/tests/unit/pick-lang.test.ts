import { describe, expect, it } from 'vitest';
import { pickLang } from '../../src/i18n';

describe('T11 first language from the phone', () => {
  it('Hindi, Turkish and English phones start in their language', () => {
    expect(pickLang(['hi-IN', 'en-US'])).toBe('hi');
    expect(pickLang(['tr-TR'])).toBe('tr');
    expect(pickLang(['en-GB'])).toBe('en');
  });
  it('an unknown language, or none, stays Greek; the first known one wins', () => {
    expect(pickLang(['sq-AL'])).toBe('el');
    expect(pickLang([])).toBe('el');
    expect(pickLang(['sq', 'tr'])).toBe('tr');
    expect(pickLang(['el-GR', 'en'])).toBe('el');
  });
});
