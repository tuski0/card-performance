import { describe, expect, it } from 'vitest';
import type { Payment } from '@/lib/cards';
import { paymentRows, summaryRows } from './export';

const p = (over: Partial<Payment>): Payment => ({
  id: 'x', cardId: 'toss', amount: 1000, merchant: 'CU강남점', category: 'convenience', brand: 'cu',
  paidAt: '2026-11-16T06:33:00Z', canceled: false, answers: {}, ...over,
});

describe('export rows', () => {
  it('payment rows use Korea time and readable labels, newest first', () => {
    const rows = paymentRows([p({ id: 'a' }), p({ id: 'b', paidAt: '2026-11-17T01:00:00Z', canceled: true })], new Map([['a', 3]]));
    expect(rows[0]).toEqual(['2026-11-17', '10:00', '토스뱅크 체크카드', 'CU강남점', 'CU', '편의점·마트', 1000, 0, '취소']);
    expect(rows[1]).toEqual(['2026-11-16', '15:33', '토스뱅크 체크카드', 'CU강남점', 'CU', '편의점·마트', 1000, 3, '']);
  });

  it('summary skips canceled payments', () => {
    const rows = summaryRows([p({ id: 'a' }), p({ id: 'b', canceled: true })], new Map([['a', 3]]));
    expect(rows).toContainEqual(['분류', '편의점·마트', 1000, 3, 1]);
    expect(rows).toContainEqual(['카드', '토스뱅크 체크카드', 1000, 3, 1]);
  });
});
