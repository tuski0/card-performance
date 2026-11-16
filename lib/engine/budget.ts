import type { Category } from '@/lib/cards';

export type BudgetRow = { category: Category; budget: number; spent: number; ratio: number; level: 'ok' | 'near' | 'over' };

/** Spending against each set budget; 'near' from 80%, 'over' past 100%. Most-used first. */
export function budgetStatus(budgets: Partial<Record<Category, number>>, spent: Partial<Record<Category, number>>): BudgetRow[] {
  return (Object.entries(budgets) as [Category, number][])
    .filter(([, b]) => b > 0)
    .map(([category, budget]) => {
      const s = spent[category] ?? 0;
      const ratio = Math.round((s / budget) * 100) / 100;
      return { category, budget, spent: s, ratio, level: (ratio > 1 ? 'over' : ratio >= 0.8 ? 'near' : 'ok') as BudgetRow['level'] };
    })
    .sort((a, b) => b.ratio - a.ratio);
}
