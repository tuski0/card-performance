import { describe, expect, it } from 'vitest';
import type { CardId, Category, Payment } from '@/lib/cards';
import { computeMonth, crossesTarget, pendingQuestions } from './compute';
import { monthKey } from './month';

let seq = 0;
function pay(cardId: CardId, amount: number, category: Category, paidAt: string, extra: Partial<Payment> = {}): Payment {
  return { id: `p${++seq}`, cardId, amount, merchant: category, category, paidAt, canceled: false, answers: {}, ...extra };
}
const NOV = '2026-11';
const prevStart = (performance: number) => ({ '2026-10': { performance, benefitUsed: {} } });
const benefit = (r: ReturnType<typeof computeMonth>, id: string) => r.benefits.find((b) => b.id === id)!;

describe('acceptance examples from the spec', () => {
  it('youthCuKbPay: CU 5,000 with KB Pay → 1,000 off, 1,000 left', () => {
    const p = pay('kb-youth-b', 5000, 'convenience', '2026-11-10T03:00:00Z', { answers: { kbPay: true } });
    const r = computeMonth('kb-youth-b', NOV, [p], prevStart(200000));
    const b = benefit(r, 'convenience');
    expect(b.applications).toEqual([{ paymentId: p.id, amount: 1000 }]);
    expect(b.remaining).toBe(1000);
  });

  it('talktalkStarbucksEasyPay: both discounts apply, payment excluded from performance', () => {
    const p = pay('kb-talktalk', 10000, 'starbucks', '2026-11-10T03:00:00Z', { answers: { easyPay: true } });
    const r = computeMonth('kb-talktalk', NOV, [p], prevStart(300000));
    expect(benefit(r, 'starbucks').used).toBe(5000);
    expect(benefit(r, 'easyPay').used).toBe(1000);
    expect(r.performance).toBe(0);
  });

  it('crossesTargetOnSave', () => {
    const a = pay('kb-youth-b', 190000, 'other', '2026-11-02T03:00:00Z');
    const b = pay('kb-youth-b', 20000, 'other', '2026-11-03T03:00:00Z');
    const before = computeMonth('kb-youth-b', NOV, [a], {});
    const after = computeMonth('kb-youth-b', NOV, [a, b], {});
    expect(crossesTarget(before, after)).toBe(true);
    expect(after.remainingToTarget).toBe(0);
  });
});

describe('rules', () => {
  it('canceledExcluded', () => {
    const p = pay('kb-youth-b', 5000, 'convenience', '2026-11-10T03:00:00Z', { answers: { kbPay: true }, canceled: true });
    const r = computeMonth('kb-youth-b', NOV, [p], prevStart(200000));
    expect(r.performance).toBe(0);
    expect(benefit(r, 'convenience').used).toBe(0);
  });

  it('unknownCategoryNoBenefit but counts toward performance', () => {
    const p = pay('toss', 10000, 'unknown', '2026-11-10T03:00:00Z');
    const r = computeMonth('toss', NOV, [p], {});
    expect(benefit(r, 'anywhere').used).toBe(0);
    expect(r.performance).toBe(10000);
  });

  it('capsAtRemainingLimit', () => {
    const ps = [
      pay('kb-youth-b', 8000, 'convenience', '2026-11-01T03:00:00Z', { answers: { kbPay: true } }),
      pay('kb-youth-b', 8000, 'convenience', '2026-11-02T03:00:00Z', { answers: { kbPay: true } }),
    ];
    const b = benefit(computeMonth('kb-youth-b', NOV, ps, prevStart(200000)), 'convenience');
    expect(b.applications.map((a) => a.amount)).toEqual([1600, 400]);
    expect(b.remaining).toBe(0);
  });

  it('usesSeoulMonthBoundary', () => {
    expect(monthKey('2026-11-30T14:30:00Z')).toBe('2026-11');
    expect(monthKey('2026-11-30T15:30:00Z')).toBe('2026-12');
  });

  it('prevMonthEditChangesEligibility', () => {
    const oct = pay('kb-youth-b', 200000, 'other', '2026-10-05T03:00:00Z');
    const cu = pay('kb-youth-b', 5000, 'convenience', '2026-11-10T03:00:00Z', { answers: { kbPay: true } });
    expect(computeMonth('kb-youth-b', NOV, [oct, cu], {}).eligibility).toBe('eligible');
    const r = computeMonth('kb-youth-b', NOV, [{ ...oct, canceled: true }, cu], {});
    expect(r.eligibility).toBe('ineligible');
    expect(benefit(r, 'convenience').used).toBe(0);
  });

  it('noPrevMonthIsUnknown', () => {
    const r = computeMonth('kb-youth-b', NOV, [], {});
    expect(r.eligibility).toBe('unknown');
    expect(r.scope).toBe('recorded-only');
  });

  it('startBalance adds performance and consumes limits', () => {
    const starts = { ...prevStart(200000), [NOV]: { performance: 50000, benefitUsed: { convenience: 1500 } } };
    const p = pay('kb-youth-b', 5000, 'convenience', '2026-11-10T03:00:00Z', { answers: { kbPay: true } });
    const r = computeMonth('kb-youth-b', NOV, [p], starts);
    expect(r.scope).toBe('with-start');
    expect(r.performance).toBe(55000);
    expect(benefit(r, 'convenience').used).toBe(2000);
  });

  it('tossCashbackNoCap', () => {
    const ps = [pay('toss', 1000, 'other', '2026-11-01T03:00:00Z'), pay('toss', 333, 'other', '2026-11-02T03:00:00Z')];
    const b = benefit(computeMonth('toss', NOV, ps, {}), 'anywhere');
    expect(b.used).toBe(3);
    expect(b.cap).toBeNull();
    expect(b.remaining).toBeNull();
  });

  it('naraIntegratedCapLimitsAllBenefits', () => {
    const ps = [
      pay('kb-nara', 50000, 'themepark', '2026-11-01T03:00:00Z'),
      pay('kb-nara', 20000, 'starbucks', '2026-11-02T03:00:00Z'),
    ];
    const r = computeMonth('kb-nara', NOV, ps, prevStart(100000));
    expect(benefit(r, 'themepark').used).toBe(5000);
    expect(benefit(r, 'starbucks').used).toBe(0);
    expect(r.performance).toBe(70000);
  });

  it('pendingQuestions asks only what the benefit needs', () => {
    expect(pendingQuestions('kb-youth-b', 'convenience').map((q) => q.key)).toEqual(['kbPay']);
    expect(pendingQuestions('kb-youth-b', 'delivery')).toEqual([]);
    expect(pendingQuestions('kb-talktalk', 'starbucks').map((q) => q.key)).toEqual(['easyPay']);
  });
});

describe('calendar helpers', async () => {
  const { dayKey, monthShape } = await import('./month');
  it('dayKey uses Seoul time', () => {
    expect(dayKey('2026-11-15T15:30:00Z')).toBe('2026-11-16');
  });
  it('monthShape for November 2026', () => {
    expect(monthShape('2026-11')).toEqual({ firstWeekday: 0, days: 30 });
    expect(monthShape('2026-02')).toEqual({ firstWeekday: 0, days: 28 });
  });
});
