import { describe, expect, it } from 'vitest';
import type { Payment } from '@/lib/cards';
import { merchantKey } from '@/lib/merchants';
import { decideIngest, type IngestContext } from './ingest';

const KB = 'KB국민카드 5351 승인\n홍*동님\n5,000원 일시불\n11/16 08:34\nCU 역삼점';
const TOSS = '토스뱅크 체크 12,000원 결제 스타벅스';
const now = new Date('2026-11-17T00:00:00Z');
const ctx = (extra: Partial<IngestContext> = {}): IngestContext => ({
  cardNumbers: { '5351': 'kb-youth-b' }, merchantMemory: {}, recent: [], ...extra,
});

describe('decideIngest', () => {
  it('records a KB notification', () => {
    const a = decideIngest(KB, ctx(), now);
    expect(a.kind).toBe('record');
    if (a.kind !== 'record') return;
    expect(a.payment.cardId).toBe('kb-youth-b');
    expect(a.payment.amount).toBe(5000);
    expect(a.payment.brand).toBe('cu');
    expect(a.payment.category).toBe('convenience');
    expect(a.payment.source).toBe('notification');
    expect(a.payment.answers).toEqual({});
  });

  it('no-card when last4 is unknown', () => {
    expect(decideIngest(KB, ctx({ cardNumbers: {} }), now)).toEqual({ kind: 'inbox', reason: 'no-card' });
  });

  it('card name in text wins', () => {
    const a = decideIngest(TOSS, ctx({ cardNumbers: {} }), now);
    expect(a.kind === 'record' && a.payment.cardId).toBe('toss');
  });

  it('remembered category wins over guess', () => {
    const a = decideIngest('토스뱅크 체크 8,000원 결제 동네식당', ctx({ merchantMemory: { [merchantKey('동네식당')]: 'cafe' } }), now);
    expect(a.kind === 'record' && a.payment.category).toBe('cafe');
  });

  it('cancels the matching payment', () => {
    const p: Payment = { id: 'p1', cardId: 'toss', amount: 12000, merchant: '스타벅스', category: 'cafe', brand: 'starbucks', paidAt: '2026-11-10T03:00:00.000Z', canceled: false, answers: {} };
    const a = decideIngest('토스뱅크 체크 12,000원 승인취소 스타벅스', ctx({ recent: [p] }), now);
    expect(a).toEqual({ kind: 'cancel', paymentId: 'p1' });
  });

  it('no-cancel-target', () => {
    const a = decideIngest('토스뱅크 체크 12,000원 승인취소 스타벅스', ctx(), now);
    expect(a).toEqual({ kind: 'inbox', reason: 'no-cancel-target' });
  });

  it('uses postedAt when the text has no time', () => {
    const at = new Date('2026-11-10T03:00:00Z');
    const a = decideIngest(TOSS, ctx(), at);
    expect(a.kind === 'record' && a.payment.paidAt).toBe('2026-11-10T03:00:00.000Z');
  });

  it('ignore', () => {
    expect(decideIngest('이번 주 혜택을 확인하세요', ctx(), now)).toEqual({ kind: 'ignore' });
  });
});
