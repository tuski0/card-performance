import { describe, expect, it } from 'vitest';
import { benefitCategory, benefitEntries, groupByCategory, searchEntries } from './benefitIndex';

const ALL = benefitEntries(['kb-talktalk', 'kb-nara', 'toss', 'kb-youth-b']);
const ids = (list: ReturnType<typeof searchEntries>) => list.map((e) => `${e.cardId}:${e.benefit.id}`);

describe('benefit index', () => {
  it('lists every benefit of every card with a category', () => {
    expect(ALL.length).toBeGreaterThan(10);
    expect(ALL.every((e) => e.category)).toBe(true);
  });

  it('files a brand-only benefit under its brands’ category', () => {
    const e = ALL.find((x) => x.cardId === 'kb-youth-b' && x.benefit.id === 'delivery')!;
    expect(benefitCategory(e.benefit)).toBe('food');
  });

  it('a category name finds benefits across cards', () => {
    const hit = ids(searchEntries(ALL, '카페'));
    expect(hit).toContain('kb-talktalk:starbucks');
  });

  it('a brand name finds the benefits that name it, on any card', () => {
    const hit = searchEntries(ALL, '스타벅스');
    expect(hit.length).toBeGreaterThan(0);
    expect(hit.every((e) => (e.benefit.brands ?? []).includes('starbucks') || e.category === 'cafe')).toBe(true);
  });

  it('merchant text resolving to a brand finds it (CU 역삼점)', () => {
    expect(ids(searchEntries(ALL, 'CU 역삼점'))).toContain('kb-youth-b:convenience');
  });

  it('wording of the benefit itself is searchable and spaces are ignored', () => {
    expect(ids(searchEntries(ALL, '쇼핑멤버십'))).toContain('kb-youth-b:shoppingMembership');
  });

  it('an empty search returns everything; nonsense returns nothing', () => {
    expect(searchEntries(ALL, '  ')).toHaveLength(ALL.length);
    expect(searchEntries(ALL, 'ㅁㄴㅇㄹ없는곳')).toEqual([]);
  });

  it('groups by category without losing entries', () => {
    const groups = groupByCategory(ALL);
    expect(groups.reduce((n, g) => n + g.entries.length, 0)).toBe(ALL.length);
    expect(new Set(groups.map((g) => g.category)).size).toBe(groups.length);
  });
});
