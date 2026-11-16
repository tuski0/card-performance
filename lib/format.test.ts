import { describe, expect, it } from 'vitest';
import { short } from './format';

describe('short', () => {
  it('keeps full numbers below 100,000', () => {
    expect(short(5980)).toBe('5,980');
    expect(short(99999)).toBe('99,999');
  });
  it('uses 만 from 100,000', () => {
    expect(short(123000)).toBe('12.3만');
    expect(short(1250000)).toBe('125만');
  });
});
