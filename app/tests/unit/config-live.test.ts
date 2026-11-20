import { describe, expect, it } from 'vitest';
import { AUTH_ENABLED, BACKEND, SYNC_CONNECTED } from '../../src/config';

describe('the live switch is closed unless the build says so', () => {
  it('a build without VITE_LIVE (CI, preview, dev) has no sign-in, no sync and no backend address', () => {
    expect(AUTH_ENABLED).toBe(false);
    expect(SYNC_CONNECTED).toBe(false);
    expect(BACKEND).toEqual({ url: '', apiKey: '' });
  });
});
