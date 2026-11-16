import { describe, expect, it } from 'vitest';
import { guessCategory } from './merchants';

describe('guessCategory', () => {
  it.each([
    ['CU 강남점', 'convenience'],
    ['GS25 역삼', 'convenience'],
    ['CU강남점', 'convenience'],
    ['CUBE카페', 'unknown'],
    ['스타벅스 선릉', 'starbucks'],
    ['STARBUCKS', 'starbucks'],
    ['배달의민족', 'delivery'],
    ['쿠팡이츠', 'delivery'],
    ['무신사', 'fashion'],
    ['올리브영', 'life'],
    ['맥도날드', 'burger'],
    ['교보문고', 'bookstore'],
    ['CGV 용산', 'cgv'],
    ['동네식당', 'unknown'],
  ])('%s → %s', (merchant, category) => {
    expect(guessCategory(merchant)).toBe(category);
  });
});

describe('Korean spellings in card notifications', () => {
  it.each([
    ['씨유(CU) 구로예성점', 'convenience'],
    ['지에스25 수지하음점', 'convenience'],
    ['스타벅스코리아', 'starbucks'],
  ])('%s → %s', (m, c) => expect(guessCategory(m)).toBe(c));
});
