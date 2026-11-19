import { describe, expect, it } from 'vitest';
import el from '../../src/i18n/el.json';

describe('T19 worker caption', () => {
  it('no longer promises «only the name»; it mentions the e-mail', () => {
    expect(el['workers.note']).not.toContain('Μόνο το όνομα');
    expect(el['workers.note']).toContain('e-mail');
  });
  it('the worker notice lists e-mail and device identifier', () => {
    expect(el['info.privacy.body']).toContain('e-mail');
    expect(el['info.privacy.body']).toContain('αναγνωριστικό της συσκευής');
  });
});
