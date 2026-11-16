import type { CardRule } from './types';

export const toss: CardRule = {
  id: 'toss',
  name: '토스뱅크 체크카드',
  tiers: [{ min: 0, totalCap: null }],
  discountedCountsToward: true,
  performanceExcludedCategories: ['excluded', 'overseas'],
  validUntil: '2027-01-20',
  benefits: [
    { id: 'anywhere', label: '어디서나 0.3% 적립', categories: 'all', kind: 'cashback', rate: 0.003, minAmount: 334, excludesFromPerformance: false },
  ],
};
