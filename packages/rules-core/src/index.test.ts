import { describe, expect, it } from 'vitest';
import { known, unknown } from './index';

describe('rules-core smoke', () => {
  it('unknown stays unknown', () => {
    expect(unknown.known).toBe(false);
    expect(known(7)).toEqual({ known: true, value: 7 });
  });
});
