import { describe, expect, it } from 'vitest';
import { guessCategory } from './merchants';

describe('guessCategory', () => {
  it.each([
    ['CU 강남점', 'convenience'],
    ['CU강남점', 'convenience'],
    ['GS25 역삼', 'convenience'],
    ['씨유(CU) 구로예성점', 'convenience'],
    ['지에스25 수지하음점', 'convenience'],
    ['스타벅스 선릉', 'cafe'],
    ['STARBUCKS', 'cafe'],
    ['배달의민족', 'food'],
    ['쿠팡이츠', 'food'],
    ['맥도날드', 'food'],
    ['무신사', 'shopping'],
    ['올리브영', 'shopping'],
    ['교보문고', 'shopping'],
    ['CGV 용산', 'leisure'],
    ['CUBE카페', 'unknown'],
    ['동네식당', 'unknown'],
  ])('%s → %s', (merchant, category) => {
    expect(guessCategory(merchant)).toBe(category);
  });
});

import { merchantKey } from './merchants';

describe('merchantKey', () => {
  it('ignores spacing and the branch suffix', () => {
    expect(merchantKey('동네식당 구로점')).toBe(merchantKey('동네식당구로점'));
  });
  it('known brands share one key across branches', () => {
    expect(merchantKey('씨유(CU) 구로예성점')).toBe('brand:cu');
    expect(merchantKey('CU강남점')).toBe('brand:cu');
  });
  it('different merchants differ', () => {
    expect(merchantKey('동네식당')).not.toBe(merchantKey('동네분식'));
  });
});
