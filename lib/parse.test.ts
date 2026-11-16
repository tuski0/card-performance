import { describe, expect, it } from 'vitest';
import { parsePaymentText } from './parse';

const NOW = new Date('2026-11-16T07:00:00Z'); // 16:00 KST

describe('parsePaymentText', () => {
  it('KB check card SMS', () => {
    const r = parsePaymentText('[Web발신]\n[KB국민체크]\n홍*동님\n11/16 15:33\n5,000원\nCU강남점 사용', NOW);
    expect(r).toMatchObject({ amount: 5000, merchant: 'CU강남점', paidAt: new Date('2026-11-16T15:33:00+09:00').toISOString() });
  });

  it('detects the card from keywords', () => {
    expect(parsePaymentText('KB국민 청춘대로톡톡 승인 12,000원 11/15 08:10 스타벅스선릉', NOW).cardId).toBe('kb-talktalk');
    expect(parsePaymentText('토스뱅크 체크카드 9,500원 결제 | 동네식당', NOW).cardId).toBe('toss');
    expect(parsePaymentText('[KB]나라사랑 체크 승인 3,000원 GS25', NOW).cardId).toBe('kb-nara');
    expect(parsePaymentText('KB Youth Club 체크 승인 4,500원 배달의민족', NOW).cardId).toBe('kb-youth-b');
  });

  it('toss style merchant after the bar', () => {
    expect(parsePaymentText('토스뱅크 체크카드 9,500원 결제 | 동네식당', NOW).merchant).toBe('동네식당');
  });

  it('missing date means now', () => {
    expect(parsePaymentText('5,000원 CU', NOW).paidAt).toBe(NOW.toISOString());
  });

  it('a December date seen in January belongs to last year', () => {
    const jan = new Date('2027-01-02T01:00:00Z');
    expect(parsePaymentText('12/31 23:10 8,000원 CU 사용', jan).paidAt).toBe(new Date('2026-12-31T23:10:00+09:00').toISOString());
  });

  it('ignores balance amounts after 잔액', () => {
    expect(parsePaymentText('[KB국민체크] 7,000원 CU 사용 잔액 123,456원', NOW).amount).toBe(7000);
  });

  it('returns nothing useful for unrelated text', () => {
    expect(parsePaymentText('안녕하세요', NOW)).toEqual({});
  });
});

describe('real KB notifications', () => {
  const check = 'KB국민체크(5351)\n선*철님\n11/16 08:34\n5,980원\n씨유(CU) 구로예성점 사용';
  const credit = 'KB국민카드4093승인\n선*철님\n9,600원 일시불\n11/15 20:47\n지에스25 수지하음점\n누적1,833,904원';

  it('check card', () => {
    expect(parsePaymentText(check, NOW)).toEqual({
      amount: 5980, merchant: '씨유(CU) 구로예성점', last4: '5351',
      paidAt: new Date('2026-11-16T08:34:00+09:00').toISOString(),
    });
  });

  it('credit card with 일시불 and 누적', () => {
    expect(parsePaymentText(credit, NOW)).toEqual({
      amount: 9600, merchant: '지에스25 수지하음점', last4: '4093',
      paidAt: new Date('2026-11-15T20:47:00+09:00').toISOString(),
    });
  });

  it('with the KB app header line', () => {
    const r = parsePaymentText(`카드 사용 알림 26.11.16 | 08:34:40\n${check}`, NOW);
    expect(r.amount).toBe(5980);
    expect(r.merchant).toBe('씨유(CU) 구로예성점');
  });
});
