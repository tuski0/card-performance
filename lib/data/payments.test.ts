import { describe, expect, it } from 'vitest';
import { listPayments } from './payments';

/** Fake query builder that serves rows in pages like PostgREST's max-rows limit. */
function fakeDb(total: number, maxRows = 1000) {
  const rows = Array.from({ length: total }, (_, i) => ({
    id: `p${i}`, card_id: 'toss', amount: 1000, merchant: 'x', category: 'etc', brand: null,
    paid_at: new Date(Date.UTC(2026, 0, 1) + i * 60000).toISOString(), canceled: false, answers: {},
  }));
  const builder = (from = 0, to = Infinity) => ({
    select: () => builder(from, to), gte: () => builder(from, to), lt: () => builder(from, to), order: () => builder(from, to),
    range: (a: number, b: number) => builder(a, b),
    then: (ok: (v: unknown) => void) => ok({ data: rows.slice(from, Math.min(to + 1, from + maxRows)), error: null }),
  });
  return { from: () => builder() } as never;
}

describe('listPayments', () => {
  it('reads past the 1,000-row response limit', async () => {
    const list = await listPayments(fakeDb(2500), { from: '2000-01-01T00:00:00Z', to: '2100-01-01T00:00:00Z' });
    expect(list).toHaveLength(2500);
    expect(list[2499].id).toBe('p2499');
  });
});
