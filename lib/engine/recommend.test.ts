import { describe, expect, it } from 'vitest';
import type { Payment } from '@/lib/cards';
import { recommend } from './recommend';

const AT = '2026-11-16T03:00:00Z';
const starts = {
  'kb-youth-b': { '2026-10': { performance: 200000, benefitUsed: {} } },
  'kb-talktalk': { '2026-10': { performance: 300000, benefitUsed: {} } },
};

describe('recommend', () => {
  it('CU 10,000: Youth Club (with KB Pay) beats Toss cashback', () => {
    const r = recommend({ brand: 'cu', category: 'convenience' }, 10000, AT, [], starts, ['toss', 'kb-youth-b']);
    expect(r[0]).toMatchObject({ cardId: 'kb-youth-b', benefit: 2000, conditions: ['KB Pay로'] });
    expect(r[1]).toMatchObject({ cardId: 'toss', benefit: 30 });
  });

  it('uses what is left of the monthly cap', () => {
    const used: Payment[] = [{
      id: 'u', cardId: 'kb-youth-b', amount: 8000, merchant: 'CU', category: 'convenience', brand: 'cu',
      paidAt: '2026-11-10T03:00:00Z', canceled: false, answers: { kbPay: true },
    }];
    const r = recommend({ brand: 'cu', category: 'convenience' }, 10000, AT, used, starts, ['kb-youth-b']);
    expect(r[0].benefit).toBe(400);
  });

  it('starbucks: talktalk 50% (plus easy-pay) is best', () => {
    const r = recommend({ brand: 'starbucks', category: 'cafe' }, 10000, AT, [], starts, ['kb-talktalk', 'toss']);
    expect(r[0]).toMatchObject({ cardId: 'kb-talktalk', benefit: 6000 });
  });

  it('marks unknown eligibility', () => {
    const r = recommend({ brand: 'cu', category: 'convenience' }, 10000, AT, [], {}, ['kb-youth-b']);
    expect(r[0].eligibility).toBe('unknown');
  });
});
