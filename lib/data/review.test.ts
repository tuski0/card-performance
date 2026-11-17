import { describe, expect, it } from 'vitest';
import type { Payment } from '@/lib/cards';
import { needsReview } from './review';

const base: Payment = {
  id: 'p1', cardId: 'kb-youth-b', amount: 5000, merchant: 'CU', category: 'convenience', brand: 'cu',
  paidAt: '2026-11-16T06:33:00Z', canceled: false, answers: {}, source: 'notification',
};

describe('needsReview', () => {
  it('ignores manual entries', () => expect(needsReview({ ...base, source: 'manual' })).toBe(false));
  it('flags an unanswered question', () => expect(needsReview(base)).toBe(true));
  it('passes once answered', () => expect(needsReview({ ...base, answers: { kbPay: false } })).toBe(false));
  it('flags an unknown category', () => expect(needsReview({ ...base, category: 'unknown', brand: null })).toBe(true));
  it('ignores canceled payments', () => expect(needsReview({ ...base, canceled: true })).toBe(false));
});
