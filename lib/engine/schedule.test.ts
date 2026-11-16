import { describe, expect, it } from 'vitest';
import { daysUntil, dueOccurrences, expiryNotices, type Recurring } from './schedule';

const rec: Recurring = {
  id: 'r1', cardId: 'kb-youth-b', amount: 55000, merchant: 'SKT', category: 'telecom',
  dayOfMonth: 25, answers: {}, active: true, startMonth: '2026-09',
};

describe('dueOccurrences', () => {
  it('creates every missing month up to today, but not future days', () => {
    const due = dueOccurrences(rec, new Set(['2026-09']), '2026-11-16');
    expect(due.map((d) => d.occurrence)).toEqual(['2026-10']);
    expect(due[0].paidAt).toBe(new Date('2026-10-25T09:00:00+09:00').toISOString());
  });

  it('includes this month once the day has come', () => {
    expect(dueOccurrences(rec, new Set(), '2026-11-25').map((d) => d.occurrence)).toEqual(['2026-09', '2026-10', '2026-11']);
  });

  it('clamps day 31 to the last day of short months', () => {
    const due = dueOccurrences({ ...rec, dayOfMonth: 31, startMonth: '2027-02' }, new Set(), '2027-03-01');
    expect(due[0].paidAt).toBe(new Date('2027-02-28T09:00:00+09:00').toISOString());
  });

  it('skips inactive schedules', () => {
    expect(dueOccurrences({ ...rec, active: false }, new Set(), '2026-11-30')).toEqual([]);
  });
});

describe('benefit expiry', () => {
  it('daysUntil counts calendar days', () => {
    expect(daysUntil('2027-01-20', '2026-11-16')).toBe(65);
    expect(daysUntil('2026-11-16', '2026-11-16')).toBe(0);
  });

  it('expiryNotices lists cards ending within the window or already ended', () => {
    expect(expiryNotices('2026-11-16', 30)).toEqual([]);
    expect(expiryNotices('2027-01-01', 30)).toEqual([{ cardId: 'toss', validUntil: '2027-01-20', daysLeft: 19 }]);
    expect(expiryNotices('2027-01-25', 30)).toEqual([{ cardId: 'toss', validUntil: '2027-01-20', daysLeft: -5 }]);
  });
});
