import { describe, expect, it } from 'vitest';
import type { Payment } from '@/lib/cards';
import { benefitMap, byDay, byMonth, byWeek, byYear } from './history';

let n = 0;
const p = (paidAt: string, amount: number, extra: Partial<Payment> = {}): Payment => ({
  id: `p${++n}`, cardId: 'toss', amount, merchant: 'x', category: 'etc', brand: null, paidAt, canceled: false, answers: {}, ...extra,
});

const pays = [
  p('2026-11-01T03:00:00Z', 1000),
  p('2026-11-01T05:00:00Z', 2000),
  p('2026-11-08T03:00:00Z', 4000),
  p('2026-11-30T14:30:00Z', 8000), // 23:30 KST on 11/30
  p('2026-11-30T15:30:00Z', 16000), // 00:30 KST on 12/1
  p('2026-11-10T03:00:00Z', 9999, { canceled: true }),
  p('2025-03-03T03:00:00Z', 500),
];
const ben = new Map([[pays[0].id, 3]]);

describe('history grouping', () => {
  it('byDay groups one month by KST date, newest first, canceled excluded from totals', () => {
    const g = byDay(pays, '2026-11', ben);
    expect(g.map((x) => x.key)).toEqual(['2026-11-30', '2026-11-10', '2026-11-08', '2026-11-01']);
    expect(g.find((x) => x.key === '2026-11-01')).toMatchObject({ spent: 3000, benefit: 3, count: 2 });
    expect(g.find((x) => x.key === '2026-11-10')).toMatchObject({ spent: 0, count: 0 });
    expect(g.find((x) => x.key === '2026-11-10')!.payments).toHaveLength(1);
  });

  it('byWeek splits a month into Sunday-start weeks clipped to the month', () => {
    const g = byWeek(pays, '2026-11', ben);
    expect(g.map((w) => [w.from, w.to])).toEqual([
      ['2026-11-01', '2026-11-07'], ['2026-11-08', '2026-11-14'], ['2026-11-15', '2026-11-21'],
      ['2026-11-22', '2026-11-28'], ['2026-11-29', '2026-11-30'],
    ]);
    expect(g.map((w) => w.spent)).toEqual([3000, 4000, 0, 0, 8000]);
  });

  it('byMonth gives 12 months of a year', () => {
    const g = byMonth(pays, '2026', ben);
    expect(g).toHaveLength(12);
    expect(g[10]).toMatchObject({ key: '2026-11', spent: 15000, benefit: 3 });
    expect(g[11]).toMatchObject({ key: '2026-12', spent: 16000 });
  });

  it('byYear lists years with records, newest first', () => {
    expect(byYear(pays, ben).map((y) => [y.key, y.spent])).toEqual([['2026', 31000], ['2025', 500]]);
  });

  it('benefitMap totals each payment across its month', () => {
    const m = benefitMap([p('2026-11-02T03:00:00Z', 10000)], {});
    expect([...m.values()]).toEqual([30]);
  });
});

import { byCard, byCategory, topMerchants } from './history';

describe('statistics', () => {
  const mk = (amount: number, over: Partial<Payment>): Payment => p('2026-11-02T03:00:00Z', amount, over);
  const list = [
    mk(10000, { category: 'cafe', brand: 'starbucks', merchant: '스타벅스 선릉', cardId: 'kb-talktalk' }),
    mk(6000, { category: 'cafe', brand: 'starbucks', merchant: '스타벅스 강남', cardId: 'toss' }),
    mk(4000, { category: 'food', brand: null, merchant: '동네식당 구로점', cardId: 'toss' }),
    mk(3000, { category: 'food', brand: null, merchant: '동네식당구로점', cardId: 'toss' }),
    mk(9999, { category: 'cafe', brand: 'starbucks', canceled: true }),
  ];
  const ben = new Map([[list[0].id, 5000], [list[1].id, 1]]);

  it('byCategory sums by category, biggest first, canceled excluded', () => {
    expect(byCategory(list, ben).map((c) => [c.category, c.spent, c.count])).toEqual([['cafe', 16000, 2], ['food', 7000, 2]]);
    expect(byCategory(list, ben)[0].benefit).toBe(5001);
  });

  it('byCard sums by card, biggest first', () => {
    expect(byCard(list, ben).map((c) => [c.cardId, c.spent])).toEqual([['toss', 13000], ['kb-talktalk', 10000]]);
  });

  it('topMerchants groups by brand name or merchant key, limited', () => {
    const t = topMerchants(list, 5);
    expect(t[0]).toEqual({ name: '스타벅스', spent: 16000, count: 2 });
    expect(t[1]).toMatchObject({ spent: 7000, count: 2 });
    expect(topMerchants(list, 1)).toHaveLength(1);
  });
});
