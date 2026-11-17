import { describe, expect, it } from 'vitest';
import { known, unknown } from './index';

describe('Known', () => {
  it('unknown says why and is never known', () => {
    expect(unknown('missing')).toEqual({ known: false, reason: 'missing' });
    expect(known(7)).toEqual({ known: true, value: 7 });
  });
});
