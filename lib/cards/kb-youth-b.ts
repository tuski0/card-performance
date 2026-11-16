import type { CardRule } from './types';

const kbPay = { key: 'kbPay', text: 'KB Pay로 결제했나요?' };

export const kbYouthB: CardRule = {
  id: 'kb-youth-b',
  name: 'KB Youth Club 체크카드 (B팩)',
  tiers: [{ min: 200000, totalCap: null }],
  discountedCountsToward: true,
  performanceExcludedCategories: ['excluded'],
  newCardGrace: { untilEndOfNextMonth: true, capRatio: 0.5 },
  benefits: [
    { id: 'shoppingMembership', label: '쇼핑 멤버십 50%', categories: ['shopping_membership'], kind: 'discount', rate: 0.5, monthlyCap: 5000, excludesFromPerformance: false },
    { id: 'telecom', label: '통신요금 30%', categories: ['telecom'], kind: 'discount', rate: 0.3, monthlyCap: 5000, excludesFromPerformance: false },
    { id: 'fashion', label: '패션 20%', categories: ['fashion'], kind: 'discount', rate: 0.2, monthlyCap: 2000, excludesFromPerformance: false },
    { id: 'life', label: '라이프 20%', categories: ['life'], kind: 'discount', rate: 0.2, monthlyCap: 2000, excludesFromPerformance: false },
    { id: 'delivery', label: '배달 20%', categories: ['delivery'], kind: 'discount', rate: 0.2, monthlyCap: 2000, excludesFromPerformance: false },
    { id: 'convenience', label: '편의점 20% (KB Pay)', categories: ['convenience'], kind: 'discount', rate: 0.2, monthlyCap: 2000, requires: [kbPay], excludesFromPerformance: false },
    { id: 'date', label: '데이트 4천 원', categories: ['family_restaurant', 'themepark'], kind: 'discount', fixed: 4000, minAmount: 10000, monthlyCap: 4000, monthlyCount: 1, excludesFromPerformance: false },
  ],
};
