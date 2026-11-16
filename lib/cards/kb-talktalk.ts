import type { CardRule } from './types';

const easyPay = { key: 'easyPay', text: '간편결제(삼성페이·네이버페이·카카오페이·KB Pay 등)로 결제했나요?' };

export const kbTalkTalk: CardRule = {
  id: 'kb-talktalk',
  name: 'KB국민 청춘대로 톡톡카드',
  tiers: [{ min: 300000, totalCap: null }],
  discountedCountsToward: false,
  performanceExcludedCategories: ['excluded'],
  newCardGrace: { untilEndOfNextMonth: true },
  benefits: [
    // 월 한도: 상품 표는 1만 원, 예시 문단은 5천 원으로 서로 다름. 표 기준으로 둔다.
    { id: 'starbucks', label: '스타벅스 50%', categories: ['starbucks'], kind: 'discount', rate: 0.5, monthlyCap: 10000, excludesFromPerformance: true },
    { id: 'burger', label: '버거·패스트푸드 20%', categories: ['burger'], kind: 'discount', rate: 0.2, monthlyCap: 5000, excludesFromPerformance: true },
    { id: 'easyPay', label: '간편결제 10%', categories: 'all', kind: 'discount', rate: 0.1, monthlyCap: 5000, requires: [easyPay], excludesFromPerformance: true },
    { id: 'basic', label: '대중교통·택시·통신 10%', categories: ['transit', 'taxi', 'telecom'], kind: 'discount', rate: 0.1, monthlyCap: 5000, excludesFromPerformance: true },
  ],
};
