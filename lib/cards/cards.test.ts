import { describe, expect, it } from 'vitest';
import { CARDS } from './index';

describe('card rules', () => {
  it('has the four supported cards', () => {
    expect(Object.keys(CARDS).sort()).toEqual(['kb-nara', 'kb-talktalk', 'kb-youth-b', 'toss']);
  });

  it('Youth Club B pack convenience: 20%, monthly cap 2,000, needs KB Pay', () => {
    const b = CARDS['kb-youth-b'].benefits.find((x) => x.id === 'convenience')!;
    expect(b.monthlyCap).toBe(2000);
    expect(b.requires?.map((q) => q.key)).toContain('kbPay');
    expect(CARDS['kb-youth-b'].tiers[0].min).toBe(200000);
  });

  it('Toss anywhere: 0.3% cashback from 334 won, no cap', () => {
    const b = CARDS['toss'].benefits[0];
    expect(b.kind).toBe('cashback');
    expect(b.rate).toBe(0.003);
    expect(b.minAmount).toBe(334);
    expect(b.monthlyCap).toBeUndefined();
    expect(CARDS['toss'].validUntil).toBe('2027-01-20');
  });

  it('Nara tiers match the integrated limit table', () => {
    expect(CARDS['kb-nara'].tiers).toEqual([
      { min: 100000, totalCap: 5000 },
      { min: 200000, totalCap: 10000 },
      { min: 300000, totalCap: 20000 },
      { min: 500000, totalCap: 30000 },
      { min: 1000000, totalCap: 50000 },
    ]);
    expect(CARDS['kb-nara'].benefits.some((b) => b.id === 'shopping')).toBe(false);
    expect(CARDS['kb-nara'].discountedCountsToward).toBe(true);
  });

  it('TalkTalk: 300k target, discounted payments excluded from performance', () => {
    expect(CARDS['kb-talktalk'].tiers[0].min).toBe(300000);
    expect(CARDS['kb-talktalk'].benefits.every((b) => b.excludesFromPerformance)).toBe(true);
  });
});
