import { describe, expect, it } from 'vitest';
import { ownedCards, searchCards } from './owned';

describe('ownedCards', () => {
  it('ownedDefaultsToAll: nothing selected means every card', () => {
    expect(ownedCards([]).sort()).toEqual(['kb-nara', 'kb-talktalk', 'kb-youth-b', 'toss']);
    expect(ownedCards([{ cardId: 'toss', owned: false }]).length).toBe(4);
  });
  it('returns only the selected cards', () => {
    expect(ownedCards([{ cardId: 'toss', owned: true }, { cardId: 'kb-nara', owned: false }])).toEqual(['toss']);
  });
});

describe('searchCards', () => {
  it('matches names ignoring spaces and case', () => {
    expect(searchCards('youth').map((c) => c.id)).toEqual(['kb-youth-b']);
    expect(searchCards('나라 사랑').map((c) => c.id)).toEqual(['kb-nara']);
    expect(searchCards('토스').map((c) => c.id)).toEqual(['toss']);
  });
  it('empty query returns all cards', () => {
    expect(searchCards('  ')).toHaveLength(4);
  });
  it('no match returns empty', () => {
    expect(searchCards('신한')).toEqual([]);
  });
});
