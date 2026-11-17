import { describe, expect, it } from 'vitest';
import { randomToken, sha256Hex } from './deviceTokens';

describe('device token helpers', () => {
  it('hashes like sha256 hex', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
  it('makes 64-char hex tokens that differ each time', () => {
    const a = randomToken(), b = randomToken();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toBe(b);
  });
});
