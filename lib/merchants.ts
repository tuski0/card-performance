import type { Category } from '@/lib/cards';

export const CATEGORY_LABELS: Record<Category, string> = {
  starbucks: '스타벅스',
  burger: '버거·패스트푸드',
  convenience: '편의점',
  transit: '대중교통',
  taxi: '택시',
  telecom: '통신요금',
  cgv: 'CGV',
  themepark: '놀이공원',
  family_restaurant: '패밀리레스토랑',
  bookstore: '서점',
  language_test: '어학시험',
  shopping_membership: '쇼핑 멤버십',
  fashion: '패션',
  life: '라이프(올리브영·야놀자)',
  delivery: '배달',
  overseas: '해외 결제',
  excluded: '실적 제외(세금·상품권 등)',
  other: '일반 결제',
  unknown: '분류 모름',
};

const RULES: [RegExp, Category][] = [
  [/스타벅스|starbucks/i, 'starbucks'],
  [/(^|\s)cu(?![a-z])|gs25|씨유/i, 'convenience'],
  [/배달의민족|배민|쿠팡이츠/, 'delivery'],
  [/무신사|29cm|w컨셉|지그재그|에이블리/i, 'fashion'],
  [/올리브영|야놀자/, 'life'],
  [/맥도날드|버거킹|롯데리아|맘스터치|kfc/i, 'burger'],
  [/교보문고/, 'bookstore'],
  [/cgv/i, 'cgv'],
  [/에버랜드|롯데월드/, 'themepark'],
  [/아웃백|vips|빕스/i, 'family_restaurant'],
  [/네이버플러스|쿠팡와우|쿠팡 와우/, 'shopping_membership'],
  [/(^|\s)(skt|kt)(\s|$)|sk텔레콤|lg ?u\+|liiv ?m/i, 'telecom'],
  [/택시|카카오t/i, 'taxi'],
  [/지하철|버스|티머니/, 'transit'],
  [/toeic|토익|jpt/i, 'language_test'],
];

/** Best guess from the merchant name; 'unknown' when nothing matches. */
export function guessCategory(merchant: string): Category {
  const m = merchant.trim();
  return RULES.find(([re]) => re.test(m))?.[1] ?? 'unknown';
}
