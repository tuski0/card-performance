import { describe, expect, it } from 'vitest';
import { budgetStatus } from './budget';

describe('budgetStatus', () => {
  it('compares spending to each budget, worst first', () => {
    const r = budgetStatus({ food: 300000, cafe: 50000, shopping: 100000 }, { food: 240000, cafe: 60000 });
    expect(r).toEqual([
      { category: 'cafe', budget: 50000, spent: 60000, ratio: 1.2, level: 'over' },
      { category: 'food', budget: 300000, spent: 240000, ratio: 0.8, level: 'near' },
      { category: 'shopping', budget: 100000, spent: 0, ratio: 0, level: 'ok' },
    ]);
  });
  it('no budgets, no rows', () => {
    expect(budgetStatus({}, { food: 1 })).toEqual([]);
  });
});
