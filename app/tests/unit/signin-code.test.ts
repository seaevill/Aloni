import { describe, expect, it } from 'vitest';
import { AuthHttp, requestCode } from '../../src/auth/gotrue';
import { RESEND_WAIT_S, cleanCode, codeError, resendLeft } from '../../src/auth/code';

describe('6-digit e-mail code (no link)', () => {
  it('accepts exactly six digits, tolerating spaces and the dash people type or paste; nothing else', () => {
    expect(cleanCode('123456')).toBe('123456');
    expect(cleanCode(' 123 456 ')).toBe('123456');
    expect(cleanCode('123-456')).toBe('123456');
    for (const bad of ['', '12345', '1234567', '12345a', 'abcdef', '１２３４５６x']) expect(cleanCode(bad)).toBeUndefined();
  });

  it('names the reason in a key the screen turns into plain Greek; unknown reasons are never called «wrong code»', () => {
    expect(codeError(new AuthHttp(400))).toBe('wrong');
    expect(codeError(new AuthHttp(401))).toBe('wrong');
    expect(codeError(new AuthHttp(403))).toBe('expired');
    expect(codeError(new AuthHttp(429))).toBe('rate');
    expect(codeError(new AuthHttp(500))).toBe('server');
    expect(codeError(new TypeError('Failed to fetch'))).toBe('net');
    expect(codeError(new Error('whatever'))).toBe('other');
  });

  it('the «Νέος κωδικός» button waits 60 s from the last send (counted in whole seconds), then is free', () => {
    expect(RESEND_WAIT_S).toBe(60);
    expect(resendLeft(0)).toBe(60);
    expect(resendLeft(30)).toBe(30);
    expect(resendLeft(59)).toBe(1);
    expect(resendLeft(60)).toBe(0);
    expect(resendLeft(999)).toBe(0);
  });

  it('an HTTP refusal of the code request carries its status (for the rate-limit message)', async () => {
    const f = (async () => ({ ok: false, status: 429, json: async () => ({}) })) as unknown as typeof fetch;
    await expect(requestCode({ url: 'https://x.example', apiKey: 'k' }, 'a@b.co', f)).rejects.toMatchObject({ status: 429 });
  });
});
