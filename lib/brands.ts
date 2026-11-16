import type { Category } from '@/lib/cards';

export type Brand = { id: string; name: string; category: Category; match: RegExp };

export const CATEGORIES: Category[] = [
  'food', 'cafe', 'convenience', 'transit', 'telecom', 'shopping', 'leisure', 'subscription', 'overseas', 'excluded', 'etc', 'unknown',
];

export const CATEGORY_LABELS: Record<Category, string> = {
  food: '식비',
  cafe: '카페',
  convenience: '편의점·마트',
  transit: '교통',
  telecom: '통신',
  shopping: '쇼핑',
  leisure: '문화·여가',
  subscription: '구독',
  overseas: '해외 결제',
  excluded: '실적 제외(세금·상품권 등)',
  etc: '기타',
  unknown: '미분류',
};

export const BRANDS: Brand[] = [
  { id: 'starbucks', name: '스타벅스', category: 'cafe', match: /스타벅스|starbucks/i },
  { id: 'cu', name: 'CU', category: 'convenience', match: /(^|[\s(])cu(?![a-z])|씨유/i },
  { id: 'gs25', name: 'GS25', category: 'convenience', match: /gs25|지에스25/i },
  { id: 'mcdonalds', name: '맥도날드', category: 'food', match: /맥도날드|mcdonald/i },
  { id: 'burgerking', name: '버거킹', category: 'food', match: /버거킹|burger ?king/i },
  { id: 'lotteria', name: '롯데리아', category: 'food', match: /롯데리아|lotteria/i },
  { id: 'momstouch', name: '맘스터치', category: 'food', match: /맘스터치/ },
  { id: 'kfc', name: 'KFC', category: 'food', match: /(^|\s)kfc|케이에프씨/i },
  { id: 'outback', name: '아웃백', category: 'food', match: /아웃백|outback/i },
  { id: 'vips', name: 'VIPS', category: 'food', match: /(^|\s)vips|빕스/i },
  { id: 'baemin', name: '배달의민족', category: 'food', match: /배달의민족|배민|우아한형제들/ },
  { id: 'coupangeats', name: '쿠팡이츠', category: 'food', match: /쿠팡이츠/ },
  { id: 'public-transit', name: '대중교통', category: 'transit', match: /지하철|버스|티머니|후불교통/ },
  { id: 'taxi', name: '택시', category: 'transit', match: /택시|카카오t/i },
  { id: 'cgv', name: 'CGV', category: 'leisure', match: /cgv/i },
  { id: 'everland', name: '에버랜드', category: 'leisure', match: /에버랜드/ },
  { id: 'lotteworld', name: '롯데월드', category: 'leisure', match: /롯데월드/ },
  { id: 'toeic', name: 'TOEIC', category: 'leisure', match: /toeic|토익/i },
  { id: 'jpt', name: 'JPT', category: 'leisure', match: /(^|\s)jpt/i },
  { id: 'yanolja', name: '야놀자', category: 'leisure', match: /야놀자/ },
  { id: 'kyobo', name: '교보문고', category: 'shopping', match: /교보문고/ },
  { id: 'musinsa', name: '무신사', category: 'shopping', match: /무신사/ },
  { id: '29cm', name: '29CM', category: 'shopping', match: /29cm/i },
  { id: 'wconcept', name: 'W컨셉', category: 'shopping', match: /w컨셉|wconcept/i },
  { id: 'zigzag', name: '지그재그', category: 'shopping', match: /지그재그/ },
  { id: 'ably', name: '에이블리', category: 'shopping', match: /에이블리/ },
  { id: 'oliveyoung', name: '올리브영', category: 'shopping', match: /올리브영/ },
  { id: 'naverplus', name: '네이버플러스', category: 'subscription', match: /네이버플러스/ },
  { id: 'coupangwow', name: '쿠팡와우', category: 'subscription', match: /쿠팡 ?와우/ },
  { id: 'skt', name: 'SKT', category: 'telecom', match: /(^|\s)skt|sk텔레콤/i },
  { id: 'kt', name: 'KT', category: 'telecom', match: /(^|\s)kt(\s|$)/i },
  { id: 'lguplus', name: 'LG U+', category: 'telecom', match: /lg ?u\+|엘지유플러스/i },
  { id: 'liivm', name: 'Liiv M', category: 'telecom', match: /liiv ?m/i },
];

export function findBrand(merchant: string): Brand | null {
  const m = merchant.trim();
  return BRANDS.find((b) => b.match.test(m)) ?? null;
}

const VALID = new Set<string>(CATEGORIES);

/** Values saved under the old category list (e.g. 'starbucks') become 'unknown'. */
export function normalizeCategory(value: string): Category {
  return VALID.has(value) ? (value as Category) : 'unknown';
}
