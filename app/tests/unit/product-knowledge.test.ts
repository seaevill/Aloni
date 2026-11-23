import { describe, expect, it } from 'vitest';
import demo from '../../../reference/prototype/data.json';
import el from '../../src/content/products/el.json';
import en from '../../src/content/products/en.json';
import { productKnowledge } from '../../src/content/products';

describe('product knowledge', () => {
  it('covers all prototype actives in all four locales', async () => {
    expect(Object.keys(el)).toEqual(Object.keys(en));
    for (const product of demo.products) {
      for (const locale of ['el', 'en', 'hi', 'tr'] as const) {
        expect(await productKnowledge(product.active, product.type, locale), product.active).toBeTruthy();
      }
    }
  });

  it('requires the recorded identity and class', async () => {
    expect(await productKnowledge('unlisted substance', 'fungicide', 'el')).toBeUndefined();
    expect(await productKnowledge('difenoconazole', 'fertiliser', 'el')).toBeUndefined();
    expect(await productKnowledge(null, 'fungicide', 'en')).toBeUndefined();
    expect(await productKnowledge('missing', undefined, 'el')).toBeUndefined();
  });
});
