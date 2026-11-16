import type { Category } from '@/lib/cards';
import { normalizeCategory } from '@/lib/brands';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function getBudgets(db: SupabaseClient): Promise<Partial<Record<Category, number>>> {
  const { data, error } = await db.from('budgets').select('category, amount');
  if (error) throw error;
  const out: Partial<Record<Category, number>> = {};
  for (const r of data as { category: string; amount: number }[]) out[normalizeCategory(r.category)] = r.amount;
  return out;
}

/** Saves one budget; 0 or empty removes it. */
export async function setBudget(db: SupabaseClient, category: Category, amount: number): Promise<void> {
  const { error } = amount > 0
    ? await db.from('budgets').upsert({ category, amount })
    : await db.from('budgets').delete().eq('category', category);
  if (error) throw error;
}
