import type { CardRule } from './types';

export const kbNara: CardRule = {
  id: 'kb-nara',
  name: 'KB국민 나라사랑체크카드',
  tiers: [
    { min: 100000, totalCap: 5000 },
    { min: 200000, totalCap: 10000 },
    { min: 300000, totalCap: 20000 },
    { min: 500000, totalCap: 30000 },
    { min: 1000000, totalCap: 50000 },
  ],
  discountedCountsToward: true,
  performanceExcludedCategories: ['excluded', 'overseas'],
  performanceExcludedBrands: ['public-transit'],
  benefits: [
    { id: 'transit', label: '대중교통 20%', brands: ['public-transit'], kind: 'discount', rate: 0.2, monthlyCap: 10000, excludesFromPerformance: false },
    { id: 'cgv', label: 'CGV 35%', brands: ['cgv'], kind: 'discount', rate: 0.35, minAmount: 10000, monthlyCap: 7000, excludesFromPerformance: false },
    { id: 'themepark', label: '에버랜드·롯데월드 50%', brands: ['everland', 'lotteworld'], kind: 'discount', rate: 0.5, minAmount: 30000, monthlyCap: 25000, excludesFromPerformance: false },
    { id: 'starbucks', label: '스타벅스 20%', brands: ['starbucks'], kind: 'discount', rate: 0.2, minAmount: 10000, monthlyCap: 4000, excludesFromPerformance: false },
    { id: 'familyRestaurant', label: '아웃백·VIPS 20%', brands: ['outback', 'vips'], kind: 'discount', rate: 0.2, minAmount: 30000, monthlyCap: 10000, excludesFromPerformance: false },
    { id: 'telecom', label: '통신 자동납부 2,500원', categories: ['telecom'], kind: 'discount', fixed: 2500, minAmount: 50000, monthlyCount: 1, excludesFromPerformance: false },
    { id: 'bookstore', label: '교보문고 5%', brands: ['kyobo'], kind: 'discount', rate: 0.05, minAmount: 20000, monthlyCap: 2500, excludesFromPerformance: false },
    { id: 'languageTest', label: 'TOEIC·JPT 2,000원', brands: ['toeic', 'jpt'], kind: 'discount', fixed: 2000, monthlyCount: 1, excludesFromPerformance: false },
  ],
};
