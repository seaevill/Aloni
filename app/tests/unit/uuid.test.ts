import { describe, expect, it } from 'vitest';
import { DEMO_FARM_ID, DEMO_NAMESPACE } from '../../src/config';
import { uuidv5 } from '../../src/db/uuid';

describe('uuidv5', () => {
  it('matches the RFC 4122 reference value (DNS namespace, www.example.com)', async () => {
    expect(await uuidv5('www.example.com', '6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe('2ed6657d-e927-568b-95e1-2665a8aea6a2');
  });
  it('is deterministic and name-sensitive', async () => {
    expect(await uuidv5('parcels:P1', DEMO_NAMESPACE)).toBe(await uuidv5('parcels:P1', DEMO_NAMESPACE));
    expect(await uuidv5('parcels:P1', DEMO_NAMESPACE)).not.toBe(await uuidv5('parcels:P2', DEMO_NAMESPACE));
  });
  it('DEMO_FARM_ID is the id the namespace gives', async () => {
    expect(await uuidv5('farm:demo', DEMO_NAMESPACE)).toBe(DEMO_FARM_ID);
  });
});
